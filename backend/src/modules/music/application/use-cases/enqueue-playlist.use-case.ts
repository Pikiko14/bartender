import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  EntityNotFoundException,
  ValidationDomainException,
} from '@core/domain/exceptions';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { YoutubeService } from '../../infrastructure/services/youtube.service';
import { MusicRequest, MusicRequestStatus } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { EnqueuePlaylistDto } from '../dto/music.dto';
import { GetQueueUseCase, MusicQueueView } from './get-queue.use-case';
import { PlaybackUseCase } from './playback.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

const MAX_PLAYLIST_ITEMS = 50;

@Injectable()
export class EnqueuePlaylistUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly youtube: YoutubeService,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
    private readonly playback: PlaybackUseCase,
  ) {}

  async execute(
    businessId: string,
    staffUserId: string,
    dto: EnqueuePlaylistDto,
  ): Promise<{ queue: MusicQueueView; addedCount: number; firstRequestId: string | null }> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    if (business.musicProvider !== MusicProvider.YOUTUBE) {
      throw new ValidationDomainException(
        'Las listas de YouTube solo están disponibles con proveedor YouTube.',
      );
    }

    const playlistId = this.youtube.parsePlaylistId(dto.playlistId) ?? dto.playlistId.trim();
    if (!playlistId) {
      throw new ValidationDomainException('Identificador de lista no válido.');
    }

    const videos = await this.youtube.getPlaylistVideos(playlistId, MAX_PLAYLIST_ITEMS);
    if (!videos.length) {
      throw new ValidationDomainException('La lista está vacía o no se pudo leer.');
    }

    let firstRequestId: string | null = null;
    for (const video of videos) {
      const request = new MusicRequest({
        id: uuid(),
        businessId,
        title: video.title,
        youtubeId: video.youtubeId,
        thumbnail: video.thumbnail ?? null,
        channelTitle: video.channelTitle ?? null,
        durationSeconds: video.durationSeconds,
        requestedBy: `staff:${staffUserId}`,
        status: MusicRequestStatus.APPROVED,
        priority: 0,
        votes: 0,
        voters: [],
        playedAt: null,
        provider: MusicProvider.YOUTUBE,
        spotifyId: null,
        artist: null,
        album: null,
      });

      const created = await this.requests.create(request);
      if (!firstRequestId) firstRequestId = created.id;
      this.realtime.emitToBusiness(
        businessId,
        SocketEvents.MUSIC_APPROVED,
        presentMusicRequest(created),
      );
    }

    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);

    if (dto.playNow && firstRequestId) {
      await this.playback.playRequest(businessId, firstRequestId);
      const updatedQueue = await this.getQueue.execute(businessId);
      return { queue: updatedQueue, addedCount: videos.length, firstRequestId };
    }

    return { queue, addedCount: videos.length, firstRequestId };
  }
}
