import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationException, EntityNotFoundException } from '@core/domain/exceptions';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { SpotifyConnectionView } from '../../domain/spotify.types';
import { SpotifyTokenService } from '../../infrastructure/services/spotify.service';

@Injectable()
export class SpotifyStatusUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async execute(businessId: string): Promise<SpotifyConnectionView> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);

    return {
      musicProvider: business.musicProvider,
      connected: business.isSpotifyConnected(),
      spotifyUserId: business.spotifyUserId,
      spotifyDisplayName: business.spotifyDisplayName,
      spotifyDeviceId: business.spotifyDeviceId,
      spotifyConnectedAt: business.spotifyConnectedAt?.toISOString() ?? null,
      spotifyLastSyncAt: business.spotifyLastSyncAt?.toISOString() ?? null,
      hasActiveDevice: !!business.spotifyDeviceId,
    };
  }
}

@Injectable()
export class SpotifyDisconnectUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async execute(businessId: string): Promise<SpotifyConnectionView> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    business.clearSpotifyConnection();
    await this.businesses.update(business);
    return {
      musicProvider: business.musicProvider,
      connected: false,
      spotifyUserId: null,
      spotifyDisplayName: null,
      spotifyDeviceId: null,
      spotifyConnectedAt: null,
      spotifyLastSyncAt: null,
      hasActiveDevice: false,
    };
  }
}

@Injectable()
export class RegisterSpotifyDeviceUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async execute(businessId: string, deviceId: string): Promise<SpotifyConnectionView> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    business.setSpotifyDevice(deviceId);
    await this.businesses.update(business);

    return {
      musicProvider: business.musicProvider,
      connected: business.isSpotifyConnected(),
      spotifyUserId: business.spotifyUserId,
      spotifyDisplayName: business.spotifyDisplayName,
      spotifyDeviceId: business.spotifyDeviceId,
      spotifyConnectedAt: business.spotifyConnectedAt?.toISOString() ?? null,
      spotifyLastSyncAt: business.spotifyLastSyncAt?.toISOString() ?? null,
      hasActiveDevice: !!business.spotifyDeviceId,
    };
  }
}

@Injectable()
export class UpdateMusicProviderUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async execute(businessId: string, provider: MusicProvider) {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    if (provider === MusicProvider.SPOTIFY && !business.isSpotifyConnected()) {
      throw new BusinessRuleViolationException('Conecta Spotify antes de activarlo como proveedor.');
    }
    business.setMusicProvider(provider);
    await this.businesses.update(business);
    return { musicProvider: business.musicProvider };
  }
}

@Injectable()
export class SpotifyPlayerTokenUseCase {
  constructor(private readonly tokens: SpotifyTokenService) {}

  async execute(businessId: string) {
    const { token, business } = await this.tokens.getValidAccessToken(businessId);
    return {
      accessToken: token,
      expiresAt: business.spotifyTokenExpiresAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
