import { Inject, Injectable } from '@nestjs/common';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { SpotifyService } from '@modules/spotify/infrastructure/services/spotify.service';
import { MusicRequestStatus } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';

@Injectable()
export class SyncSpotifyQueueUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly spotify: SpotifyService,
  ) {}

  /** Refleja en Spotify la cola Bartender (sonando + aprobadas), sin duplicar. */
  async execute(businessId: string): Promise<{ trackCount: number }> {
    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) {
      return { trackCount: 0 };
    }

    const trackIds = await this.buildTargetTrackIds(businessId);
    if (!trackIds.length) return { trackCount: 0 };

    await this.spotify.syncPlaybackQueue(businessId, trackIds);
    return { trackCount: trackIds.length };
  }

  /** Tras aprobar: encola solo la pista nueva si falta en Spotify. */
  async syncAfterApprove(
    businessId: string,
    spotifyId: string | null,
  ): Promise<{ trackCount: number }> {
    if (!spotifyId) return { trackCount: 0 };
    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) {
      return { trackCount: 0 };
    }

    if (await this.spotify.isTrackInSpotifyQueue(businessId, spotifyId)) {
      return { trackCount: 0 };
    }

    const activeId = await this.spotify.getActiveTrackId(businessId);
    if (!activeId) {
      return this.execute(businessId);
    }

    await this.spotify.addToQueue(businessId, spotifyId);
    return { trackCount: 1 };
  }

  private async buildTargetTrackIds(businessId: string): Promise<string[]> {
    const [playing, approved] = await Promise.all([
      this.requests.findNowPlaying(businessId),
      this.requests.findByBusinessAndStatuses(businessId, [MusicRequestStatus.APPROVED]),
    ]);

    const trackIds: string[] = [];
    const pushId = (id: string | null) => {
      if (id && !trackIds.includes(id)) trackIds.push(id);
    };

    if (playing?.spotifyId) pushId(playing.spotifyId);
    for (const row of approved) pushId(row.spotifyId);

    return trackIds;
  }
}
