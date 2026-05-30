import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationException, EntityNotFoundException } from '@core/domain/exceptions';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { GetQueueUseCase } from './get-queue.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class VoteSongUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly sessions: GuestSessionService,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  async execute(id: string, sessionId: string) {
    const session = await this.sessions.get(sessionId);
    const request = await this.requests.findById(id);
    if (!request || request.businessId !== session.businessId) {
      throw new EntityNotFoundException('Canción', id);
    }
    const added = request.addVote(session.sessionId);
    if (!added) {
      throw new BusinessRuleViolationException('Ya votaste esta canción.');
    }
    const updated = await this.requests.update(request);
    const queue = await this.getQueue.execute(session.businessId);
    this.realtime.emitToBusiness(session.businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return presentMusicRequest(updated);
  }
}
