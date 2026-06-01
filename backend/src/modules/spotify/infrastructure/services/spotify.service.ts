import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
} from '@core/domain/exceptions';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { Business } from '@modules/business/domain/entities/business.entity';
import { SpotifyTrackView } from '../../domain/spotify.types';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface SpotifySearchResponse {
  tracks?: {
    items?: Array<{
      id: string;
      name: string;
      duration_ms: number;
      album?: { name?: string; images?: Array<{ url: string }> };
      artists?: Array<{ name: string }>;
    }>;
  };
}

@Injectable()
export class SpotifyTokenService {
  private readonly logger = new Logger(SpotifyTokenService.name);
  private readonly tokenUrl = 'https://accounts.spotify.com/api/token';

  constructor(
    private readonly config: ConfigService,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
  ) {}

  private get clientId(): string {
    return this.config.get<string>('spotify.clientId') ?? '';
  }

  private get clientSecret(): string {
    return this.config.get<string>('spotify.clientSecret') ?? '';
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
  }

  async exchangeCode(code: string): Promise<SpotifyTokenResponse> {
    const redirectUri = this.config.get<string>('spotify.redirectUri') ?? '';
    const { data } = await axios.post<SpotifyTokenResponse>(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      { headers: { Authorization: this.authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return data;
  }

  async refreshAccessToken(business: Business): Promise<Business> {
    const refreshToken = business.spotifyRefreshToken;
    if (!refreshToken) {
      throw new BusinessRuleViolationException('Spotify no está conectado para este establecimiento.');
    }

    try {
      const { data } = await axios.post<SpotifyTokenResponse>(
        this.tokenUrl,
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
        { headers: { Authorization: this.authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      business.updateSpotifyTokens({
        spotifyAccessToken: data.access_token,
        spotifyRefreshToken: data.refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      });

      return this.businesses.update(business);
    } catch (err) {
      const msg = this.extractError(err);
      this.logger.error(`[Spotify] Error renovando token business=${business.id}: ${msg}`);
      throw new BusinessRuleViolationException('No se pudo renovar el token de Spotify. Reconecta la cuenta.');
    }
  }

  async getValidAccessToken(businessId: string): Promise<{ token: string; business: Business }> {
    let business = await this.businesses.findByIdWithSpotifySecrets(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    if (!business.spotifyRefreshToken) {
      throw new BusinessRuleViolationException('Spotify no está conectado.');
    }

    const expiresAt = business.spotifyTokenExpiresAt?.getTime() ?? 0;
    if (business.spotifyAccessToken && expiresAt - Date.now() > 60_000) {
      return { token: business.spotifyAccessToken, business };
    }

    business = await this.refreshAccessToken(business);
    if (!business.spotifyAccessToken) {
      throw new BusinessRuleViolationException('Token de Spotify inválido.');
    }
    return { token: business.spotifyAccessToken, business };
  }

  extractError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      const ax = err as AxiosError<{ error?: { message?: string }; error_description?: string }>;
      return (
        ax.response?.data?.error?.message ??
        ax.response?.data?.error_description ??
        ax.message
      );
    }
    return err instanceof Error ? err.message : String(err);
  }
}

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly apiBase = 'https://api.spotify.com/v1';

  constructor(
    private readonly tokens: SpotifyTokenService,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
  ) {}

  async search(businessId: string, query: string): Promise<SpotifyTrackView[]> {
    const { token } = await this.tokens.getValidAccessToken(businessId);
    const params = new URLSearchParams({ q: query, type: 'track', limit: '15' });

    const data = await this.apiRequest<SpotifySearchResponse>(
      businessId,
      'GET',
      `/search?${params.toString()}`,
      token,
    );

    return (data.tracks?.items ?? []).map((item) => ({
      id: item.id,
      title: item.name,
      artist: item.artists?.[0]?.name ?? '',
      album: item.album?.name ?? '',
      duration: Math.round((item.duration_ms ?? 0) / 1000),
      imageUrl: item.album?.images?.[0]?.url ?? null,
      provider: MusicProvider.SPOTIFY,
    }));
  }

  async play(businessId: string, trackId: string): Promise<void> {
    const business = await this.requireSpotifyDevice(businessId);
    const { token } = await this.tokens.getValidAccessToken(businessId);
    const deviceId = business.spotifyDeviceId!;

    await this.apiRequest(
      businessId,
      'PUT',
      `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      token,
      { uris: [`spotify:track:${trackId}`] },
    );
    this.logger.log(`[Spotify] play business=${businessId} track=${trackId} device=${deviceId}`);
  }

  async pause(businessId: string): Promise<void> {
    await this.requireSpotifyDevice(businessId);
    const { token } = await this.tokens.getValidAccessToken(businessId);
    await this.apiRequest(businessId, 'PUT', '/me/player/pause', token);
  }

  async resume(businessId: string): Promise<void> {
    const business = await this.requireSpotifyDevice(businessId);
    const { token } = await this.tokens.getValidAccessToken(businessId);
    await this.apiRequest(
      businessId,
      'PUT',
      `/me/player/play?device_id=${encodeURIComponent(business.spotifyDeviceId!)}`,
      token,
    );
  }

  async skip(businessId: string): Promise<void> {
    await this.requireSpotifyDevice(businessId);
    const { token } = await this.tokens.getValidAccessToken(businessId);
    await this.apiRequest(businessId, 'POST', '/me/player/next', token);
  }

  async getCurrentPlayback(businessId: string): Promise<Record<string, unknown> | null> {
    const { token } = await this.tokens.getValidAccessToken(businessId);
    try {
      return await this.apiRequest<Record<string, unknown>>(
        businessId,
        'GET',
        '/me/player',
        token,
      );
    } catch {
      return null;
    }
  }

  private async requireSpotifyDevice(businessId: string): Promise<Business> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    if (!business.isSpotifyConnected()) {
      throw new BusinessRuleViolationException('Spotify no está conectado para este establecimiento.');
    }
    if (!business.spotifyDeviceId) {
      throw new BusinessRuleViolationException(
        'No hay un reproductor Spotify activo. Abre /spotify-player en una tablet o PC conectada al sonido.',
      );
    }
    return business;
  }

  private async apiRequest<T>(
    businessId: string,
    method: 'GET' | 'PUT' | 'POST',
    path: string,
    token: string,
    body?: unknown,
    retried = false,
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;
    try {
      const { data, status } = await axios.request<T>({
        method,
        url,
        headers: { Authorization: `Bearer ${token}` },
        data: body,
        validateStatus: (s) => s < 500,
      });

      if (status === 401 && !retried) {
        const refreshed = await this.tokens.getValidAccessToken(businessId);
        return this.apiRequest<T>(businessId, method, path, refreshed.token, body, true);
      }

      if (status === 403) {
        throw new BusinessRuleViolationException(
          'Spotify Premium es necesario para reproducir música en el local.',
        );
      }

      if (status === 404 && path.includes('/me/player')) {
        throw new BusinessRuleViolationException(
          'No hay un reproductor Spotify activo. Abre /spotify-player y espera la conexión.',
        );
      }

      if (status >= 400) {
        const errBody = data as { error?: { message?: string } };
        throw new BusinessRuleViolationException(
          errBody?.error?.message ?? `Error Spotify (${status})`,
        );
      }

      return data;
    } catch (err) {
      if (err instanceof BusinessRuleViolationException) throw err;
      const msg = this.tokens.extractError(err);
      this.logger.error(`[Spotify] API ${method} ${path} business=${businessId}: ${msg}`);
      throw new BusinessRuleViolationException(msg);
    }
  }
}
