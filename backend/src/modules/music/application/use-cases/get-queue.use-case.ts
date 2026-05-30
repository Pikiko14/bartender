import { Inject, Injectable } from '@nestjs/common';
import { MusicRequestStatus } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { MusicRequestView, presentMusicRequest } from '../presenters/music.presenter';

export interface MusicQueueView {
  nowPlaying: MusicRequestView | null;
  queue: MusicRequestView[];
  pending: MusicRequestView[];
}

@Injectable()
export class GetQueueUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
  ) {}

  async execute(businessId: string): Promise<MusicQueueView> {
    const [playing, approved, pending] = await Promise.all([
      this.requests.findNowPlaying(businessId),
      this.requests.findByBusinessAndStatuses(businessId, [MusicRequestStatus.APPROVED]),
      this.requests.findByBusinessAndStatuses(businessId, [MusicRequestStatus.PENDING]),
    ]);

    return {
      nowPlaying: playing ? presentMusicRequest(playing) : null,
      queue: approved.map(presentMusicRequest),
      pending: pending.map(presentMusicRequest),
    };
  }

  /** Cola pública (sin la bandeja de moderación). */
  async publicQueue(businessId: string): Promise<Omit<MusicQueueView, 'pending'>> {
    const full = await this.execute(businessId);
    return { nowPlaying: full.nowPlaying, queue: full.queue };
  }
}
