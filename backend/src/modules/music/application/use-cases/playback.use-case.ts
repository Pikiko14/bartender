import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationException, EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
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

  /** Reproduce de inmediato una canción aprobada de la cola. */
  async playRequest(businessId: string, requestId: string): Promise<MusicRequestView> {
    return this.syncNowPlaying(businessId, requestId, { previousAsSkipped: true });
  }

  /**
   * Marca la pista que suena en pantalla DJ/TV como `playing` en BD.
   * Usado cuando el reproductor avanza automáticamente.
   */
  async syncNowPlaying(
    businessId: string,
    requestId: string,
    options: { previousAsSkipped?: boolean } = {},
  ): Promise<MusicRequestView> {
    const request = await this.requests.findById(requestId);
    if (!request) throw new EntityNotFoundException('Canción', requestId);
    if (request.businessId !== businessId) {
      throw new ForbiddenDomainException('La canción no pertenece a tu negocio.');
    }

    const current = await this.requests.findNowPlaying(businessId);
    if (current?.id === requestId) {
      return presentMusicRequest(current);
    }

    if (current) {
      if (options.previousAsSkipped) current.skip();
      else current.markPlayed();
      await this.requests.update(current);
      if (options.previousAsSkipped) {
        this.realtime.emitToBusiness(
          businessId,
          SocketEvents.MUSIC_SKIPPED,
          presentMusicRequest(current),
        );
      }
    }

    if (request.status !== MusicRequestStatus.APPROVED) {
      throw new BusinessRuleViolationException(
        'Solo se puede marcar como reproduciendo una canción aprobada en cola.',
      );
    }

    request.markPlaying();
    const updated = await this.requests.update(request);
    const view = presentMusicRequest(updated);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_PLAYING, view);
    await this.emitQueue(businessId);
    return view;
  }

  private async emitQueue(businessId: string): Promise<void> {
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
  }
}
