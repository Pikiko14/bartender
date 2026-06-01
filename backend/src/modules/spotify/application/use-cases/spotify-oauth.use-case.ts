import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac, createHash, randomBytes } from 'crypto';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  ForbiddenDomainException,
} from '@core/domain/exceptions';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { SPOTIFY_SCOPES } from '../../domain/spotify.types';
import { SpotifyTokenService } from '../../infrastructure/services/spotify.service';

interface OAuthStatePayload {
  businessId: string;
  ownerId: string;
  nonce: string;
}

@Injectable()
export class SpotifyOAuthUseCase {
  private readonly logger = new Logger(SpotifyOAuthUseCase.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly tokens: SpotifyTokenService,
  ) {}

  buildConnectUrl(businessId: string, ownerId: string): string {
    const clientId = this.config.get<string>('spotify.clientId') ?? '';
    const redirectUri = this.config.get<string>('spotify.redirectUri') ?? '';
    if (!clientId || !redirectUri) {
      throw new BusinessRuleViolationException('Spotify no está configurado en el servidor.');
    }

    const state = this.signState({ businessId, ownerId, nonce: randomBytes(8).toString('hex') });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      state,
      show_dialog: 'true',
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<{ businessId: string; success: boolean }> {
    const payload = this.verifyState(state);
    const business = await this.businesses.findById(payload.businessId);
    if (!business) throw new EntityNotFoundException('Negocio', payload.businessId);
    if (business.ownerId !== payload.ownerId) {
      throw new ForbiddenDomainException('No puedes conectar Spotify para este negocio.');
    }

    const redirectUri = this.config.get<string>('spotify.redirectUri') ?? '';
    this.logger.log(
      `[Spotify] handleCallback start business=${business.id} redirectUri=${redirectUri}`,
    );

    let tokenData: Awaited<ReturnType<SpotifyTokenService['exchangeCode']>>;
    try {
      tokenData = await this.tokens.exchangeCode(code);
    } catch (err) {
      const message = this.extractError(err);
      this.logger.error(`[Spotify] exchangeCode failed business=${business.id}: ${message}`);
      throw new BusinessRuleViolationException(`Spotify OAuth: exchangeCode falló: ${message}`);
    }

    if (!tokenData.refresh_token) {
      throw new BusinessRuleViolationException(
        'Spotify no devolvió refresh_token. Reintenta la conexión.',
      );
    }

    const accessToken = tokenData.access_token;
    const tokenFp = createHash('sha256').update(accessToken).digest('hex').slice(0, 12);

    // Persistir tokens antes de /v1/me: búsqueda y reproductor dependen del refresh_token.
    business.applySpotifyOAuthTokens({
      spotifyAccessToken: accessToken,
      spotifyRefreshToken: tokenData.refresh_token,
      spotifyTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });
    business.setMusicProvider(MusicProvider.SPOTIFY);
    await this.businesses.update(business);

    try {
      const { data: profile } = await axios.get<{ id: string; display_name?: string }>(
        'https://api.spotify.com/v1/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 15_000,
        },
      );
      business.setSpotifyProfile(profile.id, profile.display_name ?? null);
      await this.businesses.update(business);
      this.logger.log(
        `[Spotify] connected business=${business.id} user=${profile.id} displayName=${profile.display_name ?? '—'}`,
      );
    } catch (err) {
      const message = this.extractError(err);
      this.logger.warn(
        `[Spotify] /v1/me failed after tokens saved business=${business.id} tokenFp=${tokenFp}: ${message}`,
      );
      if (axios.isAxiosError(err)) {
        this.logger.warn(
          JSON.stringify({
            code: err.code,
            message: err.message,
            responseStatus: err.response?.status,
            responseData: err.response?.data,
          }),
        );
      }
      // OAuth exitoso: tokens guardados; perfil se puede completar en el siguiente uso.
    }

    return { businessId: business.id, success: true };
  }

  private signState(payload: OAuthStatePayload): string {
    const secret = this.config.get<string>('jwt.accessSecret') ?? 'spotify-state';
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  private verifyState(state: string): OAuthStatePayload {
    const [body, sig] = state.split('.');
    if (!body || !sig) throw new BusinessRuleViolationException('Estado OAuth inválido.');
    const secret = this.config.get<string>('jwt.accessSecret') ?? 'spotify-state';
    const expected = createHmac('sha256', secret).update(body).digest('base64url');
    if (sig !== expected) throw new BusinessRuleViolationException('Estado OAuth inválido.');
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
  }

  private extractError(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return (
        err.response?.data?.error_description ??
        err.response?.data?.error?.message ??
        err.response?.status?.toString() ??
        err.message
      );
    }
    return err instanceof Error ? err.message : String(err);
  }
}
