import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationException } from '@core/domain/exceptions';
import { MusicRequestStatus } from '../../domain/entities/music-request.entity';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { GetQueueUseCase } from './get-queue.use-case';
import { MusicRequestView, presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class PlaybackUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  /** Reproduce la siguiente canción aprobada (FIFO con prioridad/votos). */
  async playNext(businessId: string): Promise<MusicRequestView | null> {
    const current = await this.requests.findNowPlaying(businessId);
    if (current) {
      current.markPlayed();
      await this.requests.update(current);
    }

    const approved = await this.requests.findByBusinessAndStatuses(businessId, [
      MusicRequestStatus.APPROVED,
    ]);
    const next = approved[0];
    if (!next) {
      await this.emitQueue(businessId);
      this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_PLAYING, null);
      return null;
    }

    next.markPlaying();
    const updated = await this.requests.update(next);
    const view = presentMusicRequest(updated);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_PLAYING, view);
    await this.emitQueue(businessId);
    return view;
  }

  async skip(businessId: string): Promise<MusicRequestView | null> {
    const current = await this.requests.findNowPlaying(businessId);
    if (!current) {
      throw new BusinessRuleViolationException('No hay ninguna canción reproduciéndose.');
    }
    current.skip();
    const skipped = await this.requests.update(current);
    this.realtime.emitToBusiness(
      businessId,
      SocketEvents.MUSIC_SKIPPED,
      presentMusicRequest(skipped),
    );
    return this.playNext(businessId);
  }

  private async emitQueue(businessId: string): Promise<void> {
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
  }
}
