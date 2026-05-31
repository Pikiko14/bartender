import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ForbiddenDomainException } from '@core/domain/exceptions';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import { MusicRequest, MusicRequestStatus } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { RequestSongDto } from '../dto/music.dto';
import { GetQueueUseCase } from './get-queue.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class RequestSongUseCase {
  // Anti-spam: máximo de canciones por sesión por ventana.
  private readonly spamLimit = 3;
  private readonly windowSeconds = 120;

  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly sessions: GuestSessionService,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  async execute(dto: RequestSongDto) {
    const session = await this.sessions.get(dto.sessionId);

    const since = new Date(Date.now() - this.windowSeconds * 1000);
    const recent = await this.requests.countRecentBySession(
      session.businessId,
      session.sessionId,
      since,
    );
    if (recent >= this.spamLimit) {
      throw new ForbiddenDomainException(
        'Has pedido demasiadas canciones. Espera unos minutos antes de pedir otra.',
      );
    }

    const request = new MusicRequest({
      id: uuid(),
      businessId: session.businessId,
      title: dto.title,
      youtubeId: dto.youtubeId,
      thumbnail: dto.thumbnail ?? null,
      channelTitle: dto.channelTitle ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      requestedBy: session.sessionId,
      status: MusicRequestStatus.PENDING,
      priority: 0,
      votes: 0,
      voters: [],
      playedAt: null,
    });

    const created = await this.requests.create(request);
    const view = presentMusicRequest(created);
    this.realtime.emitToBusiness(session.businessId, SocketEvents.MUSIC_REQUESTED, view);
    const queue = await this.getQueue.execute(session.businessId);
    this.realtime.emitToBusiness(session.businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return view;
  }
}
