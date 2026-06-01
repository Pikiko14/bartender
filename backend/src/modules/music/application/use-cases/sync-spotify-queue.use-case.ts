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

  /** Refleja en Spotify la cola Bartender (sonando + aprobadas). */
  async execute(businessId: string): Promise<{ trackCount: number }> {
    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) {
      return { trackCount: 0 };
    }

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

    if (!trackIds.length) return { trackCount: 0 };

    await this.spotify.syncPlaybackQueue(businessId, trackIds);
    return { trackCount: trackIds.length };
  }

  /**
   * Tras aprobar: encola en Spotify la pista nueva.
   * Si el reproductor Bartender ya está activo → addToQueue (sin duplicar toda la cola).
   * Si no hay sesión activa → sincroniza sonando + aprobadas.
   */
  async syncAfterApprove(
    businessId: string,
    spotifyId: string | null,
  ): Promise<{ trackCount: number }> {
    if (!spotifyId) return { trackCount: 0 };
    const business = await this.businesses.findById(businessId);
    if (!business || business.musicProvider !== MusicProvider.SPOTIFY) {
      return { trackCount: 0 };
    }

    try {
      const activeId = await this.spotify.getActiveTrackId(businessId);
      if (activeId) {
        await this.spotify.addToQueue(businessId, spotifyId);
        return { trackCount: 1 };
      }
    } catch {
      /* Sin dispositivo activo: reconstruir cola completa abajo. */
    }

    return this.execute(businessId);
  }
}
