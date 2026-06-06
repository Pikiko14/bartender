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
import { MusicRequest, MusicRequestStatus } from '../../domain/entities/music-request.entity';
import {
  MUSIC_REQUEST_REPOSITORY,
  MusicRequestRepository,
} from '../../domain/repositories/music-request.repository';
import { EnqueueSongDto } from '../dto/music.dto';
import { GetQueueUseCase, MusicQueueView } from './get-queue.use-case';
import { SyncSpotifyQueueUseCase } from './sync-spotify-queue.use-case';
import { presentMusicRequest } from '../presenters/music.presenter';

@Injectable()
export class EnqueueSongUseCase {
  constructor(
    @Inject(MUSIC_REQUEST_REPOSITORY) private readonly requests: MusicRequestRepository,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly realtime: RealtimeService,
    private readonly getQueue: GetQueueUseCase,
    private readonly syncSpotifyQueue: SyncSpotifyQueueUseCase,
  ) {}

  async execute(
    businessId: string,
    staffUserId: string,
    dto: EnqueueSongDto,
  ): Promise<MusicQueueView> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);

    const isSpotify = business.musicProvider === MusicProvider.SPOTIFY;
    if (isSpotify && !dto.spotifyId) {
      throw new ValidationDomainException('Falta el identificador de Spotify.');
    }
    if (!isSpotify && !dto.youtubeId) {
      throw new ValidationDomainException('Falta el identificador de YouTube.');
    }

    const request = new MusicRequest({
      id: uuid(),
      businessId,
      title: dto.title,
      youtubeId: dto.youtubeId ?? '',
      thumbnail: dto.thumbnail ?? null,
      channelTitle: dto.channelTitle ?? dto.artist ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      requestedBy: `staff:${staffUserId}`,
      status: MusicRequestStatus.APPROVED,
      priority: 0,
      votes: 0,
      voters: [],
      playedAt: null,
      provider: isSpotify ? MusicProvider.SPOTIFY : MusicProvider.YOUTUBE,
      spotifyId: dto.spotifyId ?? null,
      artist: dto.artist ?? null,
      album: dto.album ?? null,
    });

    const created = await this.requests.create(request);
    const view = presentMusicRequest(created);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_APPROVED, view);
    const queue = await this.getQueue.execute(businessId);
    this.realtime.emitToBusiness(businessId, SocketEvents.MUSIC_QUEUE_UPDATED, queue);
    await this.syncSpotifyQueue
      .syncAfterApprove(businessId, created.spotifyId)
      .catch(() => undefined);
    return queue;
  }
}
