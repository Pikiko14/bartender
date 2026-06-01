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

  async onTrackStarted(businessId: string, track: MusicRequestView | null): Promise<void> {
    if (!track || track.provider !== MusicProvider.SPOTIFY || !track.spotifyId) return;

    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) return;

    try {
      await this.spotify.play(businessId, track.spotifyId);
    } catch (err) {
      this.logger.error(
        `[Spotify] Fallo al reproducir track=${track.spotifyId} business=${businessId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async onPlaybackControl(
    businessId: string,
    action: 'play' | 'pause' | 'skip',
  ): Promise<void> {
    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) return;

    try {
      if (action === 'pause') await this.spotify.pause(businessId);
      else if (action === 'play') await this.spotify.resume(businessId);
      else if (action === 'skip') await this.spotify.skip(businessId);
    } catch (err) {
      this.logger.warn(
        `[Spotify] Control ${action} business=${businessId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
