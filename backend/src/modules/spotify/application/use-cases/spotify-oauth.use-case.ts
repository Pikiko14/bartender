import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac, randomBytes } from 'crypto';
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

    const tokenData = await this.tokens.exchangeCode(code);

    const { data: profile } = await axios.get<{ id: string; display_name?: string }>(
      'https://api.spotify.com/v1/me',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    business.setSpotifyConnection({
      spotifyUserId: profile.id,
      spotifyDisplayName: profile.display_name ?? null,
      spotifyAccessToken: tokenData.access_token,
      spotifyRefreshToken: tokenData.refresh_token ?? '',
      spotifyTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });
    business.setMusicProvider(MusicProvider.SPOTIFY);
    await this.businesses.update(business);

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
}
