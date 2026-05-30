import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { SetPriorityDto } from '../../application/dto/music.dto';
import { GetQueueUseCase } from '../../application/use-cases/get-queue.use-case';
import { ModerateMusicUseCase } from '../../application/use-cases/moderate-music.use-case';
import { PlaybackUseCase } from '../../application/use-cases/playback.use-case';

@Controller('music')
export class MusicController {
  constructor(
    private readonly getQueue: GetQueueUseCase,
    private readonly moderate: ModerateMusicUseCase,
    private readonly playback: PlaybackUseCase,
  ) {}

  @Get('queue')
  @RequirePermissions(Permission.MUSIC_MODERATE)
  queue(@CurrentUser('businessId') businessId: string) {
    return this.getQueue.execute(businessId);
  }

  @Patch('requests/:id/approve')
  @RequirePermissions(Permission.MUSIC_MODERATE)
  approve(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    return this.moderate.approve(businessId, id);
  }

  @Patch('requests/:id/reject')
  @RequirePermissions(Permission.MUSIC_MODERATE)
  reject(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    return this.moderate.reject(businessId, id);
  }

  @Patch('requests/:id/priority')
  @RequirePermissions(Permission.MUSIC_MODERATE)
  priority(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: SetPriorityDto,
  ) {
    return this.moderate.setPriority(businessId, id, dto.priority);
  }

  @Post('play-next')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  playNext(@CurrentUser('businessId') businessId: string) {
    return this.playback.playNext(businessId);
  }

  @Post('skip')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  skip(@CurrentUser('businessId') businessId: string) {
    return this.playback.skip(businessId);
  }

  @Post('requests/:id/play')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  playRequest(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    return this.playback.playRequest(businessId, id);
  }

  /** Pantalla DJ: confirma qué canción está sonando (status → playing). */
  @Post('requests/:id/sync-playing')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  syncPlaying(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    return this.playback.syncNowPlaying(businessId, id);
  }
}
