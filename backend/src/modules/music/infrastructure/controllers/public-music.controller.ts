import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@shared/decorators';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import {
  FindAlternativeDto,
  RequestSongDto,
  SearchMusicDto,
  UpdatePlaybackSourceDto,
  VoteSongDto,
} from '../../application/dto/music.dto';
import { GetQueueUseCase } from '../../application/use-cases/get-queue.use-case';
import { PlaybackUseCase } from '../../application/use-cases/playback.use-case';
import { RequestSongUseCase } from '../../application/use-cases/request-song.use-case';
import { ResolveMusicPlaybackUseCase } from '../../application/use-cases/resolve-music-playback.use-case';
import { VoteSongUseCase } from '../../application/use-cases/vote-song.use-case';
import { YoutubeService } from '../services/youtube.service';

@Public()
@Controller('public/music')
export class PublicMusicController {
  constructor(
    private readonly youtube: YoutubeService,
    private readonly requestSong: RequestSongUseCase,
    private readonly voteSong: VoteSongUseCase,
    private readonly getQueue: GetQueueUseCase,
    private readonly playback: PlaybackUseCase,
    private readonly resolvePlayback: ResolveMusicPlaybackUseCase,
    private readonly getBusiness: GetBusinessUseCase,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('search')
  search(@Query() dto: SearchMusicDto) {
    return this.youtube.search(dto.q);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('videos/:videoId/embeddable')
  async embeddable(@Param('videoId') videoId: string) {
    return { embeddable: await this.youtube.isEmbeddable(videoId) };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('alternatives')
  async alternatives(@Query() dto: FindAlternativeDto) {
    return this.youtube.findAlternativeVideo(dto.title, dto.artist);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('request')
  request(@Body() dto: RequestSongDto) {
    return this.requestSong.execute(dto);
  }

  @Post('requests/:id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteSongDto) {
    return this.voteSong.execute(id, dto.sessionId);
  }

  @Get(':businessSlug/queue')
  async queue(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.getQueue.publicQueue(business.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':businessSlug/skip')
  async skip(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.playback.skip(business.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Patch(':businessSlug/requests/:id/playback-source')
  async updatePlaybackSource(
    @Param('businessSlug') businessSlug: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlaybackSourceDto,
  ) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.resolvePlayback.updateSource(business.id, id, dto);
  }

  /** Avanza la cola desde pantallas DJ/TV públicas (sin login de staff). */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':businessSlug/play-next')
  async playNext(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.playback.playNext(business.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':businessSlug/requests/:id/play')
  async playRequest(
    @Param('businessSlug') businessSlug: string,
    @Param('id') id: string,
  ) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.playback.playRequest(business.id, id);
  }

  /** Pantalla DJ pública: marca la pista en reproducción (status → playing). */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':businessSlug/requests/:id/sync-playing')
  async syncPlaying(
    @Param('businessSlug') businessSlug: string,
    @Param('id') id: string,
  ) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.playback.syncNowPlaying(business.id, id);
  }
}
