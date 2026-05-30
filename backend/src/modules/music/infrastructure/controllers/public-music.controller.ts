import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@shared/decorators';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import { RequestSongDto, SearchMusicDto, VoteSongDto } from '../../application/dto/music.dto';
import { GetQueueUseCase } from '../../application/use-cases/get-queue.use-case';
import { RequestSongUseCase } from '../../application/use-cases/request-song.use-case';
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
    private readonly getBusiness: GetBusinessUseCase,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('search')
  search(@Query() dto: SearchMusicDto) {
    return this.youtube.search(dto.q);
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
}
