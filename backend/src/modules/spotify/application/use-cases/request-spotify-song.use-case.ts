import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ForbiddenDomainException } from '@core/domain/exceptions';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import { MusicRequest, MusicRequestStatus } from '@modules/music/domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '@modules/music/domain/repositories/music-request.repository';
import { GetQueueUseCase } from '@modules/music/application/use-cases/get-queue.use-case';
import { presentMusicRequest } from '@modules/music/application/presenters/music.presenter';
import { RegisterSpotifySongDto } from '../dto/spotify.dto';

@Injectable()
export class RequestSpotifySongUseCase {
  private readonly spamLimit = 3;
  private readonly windowSeconds = 120;

  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly sessions: GuestSessionService,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  async execute(dto: RegisterSpotifySongDto) {
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
      youtubeId: '',
      thumbnail: dto.thumbnail ?? null,
      channelTitle: dto.artist ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      requestedBy: session.sessionId,
      status: MusicRequestStatus.PENDING,
      priority: 0,
      votes: 0,
      voters: [],
      playedAt: null,
      provider: MusicProvider.SPOTIFY,
      spotifyId: dto.spotifyId,
      artist: dto.artist ?? null,
      album: dto.album ?? null,
    });

    const created = await this.requests.create(request);
    const view = presentMusicRequest(created);
    this.realtime.emitToBusiness(session.businessId, SocketEvents.MUSIC_REQUESTED, view);
    const queue = await this.getQueue.execute(session.businessId);
    this.realtime.emitToBusiness(session.businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return view;
  }
}
