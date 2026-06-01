import { Inject, Injectable, Logger } from '@nestjs/common';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { MusicRequestView } from '@modules/music/application/presenters/music.presenter';
import { SpotifyService } from './spotify.service';

/** Dispara reproducción en Spotify cuando la cola Bartender avanza (sin tocar YouTube). */
@Injectable()
export class SpotifyPlaybackBridge {
  private readonly logger = new Logger(SpotifyPlaybackBridge.name);

  constructor(
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly spotify: SpotifyService,
  ) {}

  async onTrackStarted(
    businessId: string,
    track: MusicRequestView | null,
    upcomingSpotifyIds: string[] = [],
  ): Promise<void> {
    if (!track || track.provider !== MusicProvider.SPOTIFY || !track.spotifyId) return;

    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) return;

    const order = [track.spotifyId, ...upcomingSpotifyIds.filter((id) => id && id !== track.spotifyId)];
    await this.spotify.syncPlaybackQueue(businessId, order);
  }

  async onPlaybackControl(
    businessId: string,
    action: 'play' | 'pause' | 'skip',
  ): Promise<void> {
    const business = await this.businesses.findByIdWithSpotifySecrets(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) return;

    if (action === 'pause') await this.spotify.pause(businessId);
    else if (action === 'play') await this.spotify.resume(businessId);
    else if (action === 'skip') await this.spotify.skip(businessId);
  }
}
