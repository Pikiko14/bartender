import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { MusicRequest } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { GetQueueUseCase, MusicQueueView } from './get-queue.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class ModerateMusicUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  async approve(businessId: string, id: string): Promise<MusicQueueView> {
    const request = await this.getOwned(businessId, id);
    request.approve();
    const updated = await this.requests.update(request);
    this.realtime.emitToBusiness(
      businessId,
      SocketEvents.MUSIC_APPROVED,
      presentMusicRequest(updated),
    );
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return queue;
  }

  async reject(businessId: string, id: string): Promise<MusicQueueView> {
    const request = await this.getOwned(businessId, id);
    request.reject();
    const updated = await this.requests.update(request);
    this.realtime.emitToBusiness(
      businessId,
      SocketEvents.MUSIC_REJECTED,
      presentMusicRequest(updated),
    );
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return queue;
  }

  async setPriority(businessId: string, id: string, priority: number) {
    const request = await this.getOwned(businessId, id);
    request.setPriority(priority);
    const updated = await this.requests.update(request);
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return presentMusicRequest(updated);
  }

  private async getOwned(businessId: string, id: string): Promise<MusicRequest> {
    const request = await this.requests.findById(id);
    if (!request) throw new EntityNotFoundException('Canción', id);
    if (request.businessId !== businessId) {
      throw new ForbiddenDomainException('La canción no pertenece a tu negocio.');
    }
    return request;
  }

}
