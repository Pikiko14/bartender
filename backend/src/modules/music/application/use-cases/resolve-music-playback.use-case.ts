import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  ForbiddenDomainException,
} from '@core/domain/exceptions';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { MusicRequest } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { YoutubeService } from '../../infrastructure/services/youtube.service';
import { GetQueueUseCase } from './get-queue.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class ResolveMusicPlaybackUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    private readonly youtube: YoutubeService,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
  ) {}

  /** Devuelve null si no hay versión embeddable (marca skipped internamente). */
  async ensurePlayable(request: MusicRequest): Promise<MusicRequest | null> {
    const p = request.toPrimitives();
    if (p.provider === MusicProvider.SPOTIFY) {
      return p.spotifyId ? request : null;
    }

    const resolved = await this.youtube.resolveForPlayback({
      youtubeId: p.youtubeId,
      title: p.title,
      channelTitle: p.channelTitle ?? '',
      thumbnail: p.thumbnail ?? '',
      durationSeconds: p.durationSeconds,
    });

    if (!resolved) return null;

    if (
      resolved.youtubeId !== p.youtubeId ||
      resolved.title !== p.title ||
      resolved.thumbnail !== (p.thumbnail ?? '') ||
      resolved.channelTitle !== (p.channelTitle ?? '')
    ) {
      request.updatePlaybackSource({
        youtubeId: resolved.youtubeId,
        title: resolved.title,
        thumbnail: resolved.thumbnail,
        channelTitle: resolved.channelTitle,
      });
    }

    return request;
  }

  async updateSource(
    businessId: string,
    requestId: string,
    source: { youtubeId: string; title: string; thumbnail?: string | null; channelTitle?: string | null },
  ) {
    const request = await this.requests.findById(requestId);
    if (!request) throw new EntityNotFoundException('Canción', requestId);
    if (request.businessId !== businessId) {
      throw new ForbiddenDomainException('La canción no pertenece a tu negocio.');
    }

    const embeddable = await this.youtube.isEmbeddable(source.youtubeId);
    if (!embeddable) {
      throw new BusinessRuleViolationException('El video indicado no se puede reproducir embebido.');
    }

    request.updatePlaybackSource(source);
    const updated = await this.requests.update(request);
    const view = presentMusicRequest(updated);
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    return view;
  }
}
