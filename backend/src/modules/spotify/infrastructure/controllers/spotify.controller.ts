import { Controller, Delete, Get, Patch, Post, Body, Query, Res, Param, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import {
  RegisterSpotifyDeviceDto,
  RegisterSpotifySongDto,
  SpotifySearchDto,
  UpdateMusicProviderDto,
} from '../../application/dto/spotify.dto';
import { SpotifyOAuthUseCase } from '../../application/use-cases/spotify-oauth.use-case';
import { RequestSpotifySongUseCase } from '../../application/use-cases/request-spotify-song.use-case';
import {
  RegisterSpotifyDeviceUseCase,
  SpotifyDisconnectUseCase,
  SpotifyPlayerTokenUseCase,
  SpotifyStatusUseCase,
  UpdateMusicProviderUseCase,
} from '../../application/use-cases/spotify-settings.use-case';
import { SpotifyService } from '../services/spotify.service';

@Controller('spotify')
export class SpotifyController {
  private readonly logger = new Logger(SpotifyController.name);

  constructor(
    private readonly oauth: SpotifyOAuthUseCase,
    private readonly status: SpotifyStatusUseCase,
    private readonly disconnect: SpotifyDisconnectUseCase,
    private readonly registerDevice: RegisterSpotifyDeviceUseCase,
    private readonly playerToken: SpotifyPlayerTokenUseCase,
    private readonly updateProvider: UpdateMusicProviderUseCase,
    private readonly spotify: SpotifyService,
    private readonly config: ConfigService,
  ) {}

  @Get('connect')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  connect(@CurrentUser('businessId') businessId: string, @CurrentUser('userId') userId: string) {
    return { url: this.oauth.buildConnectUrl(businessId, userId) };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const appUrl = this.config.get<string>('mercadoPago.publicAppUrl') ?? 'http://localhost:5173';
    if (error || !code || !state) {
      return res.redirect(`${appUrl}/app/settings/business?error=oauth_denied`);
    }
    try {
      await this.oauth.handleCallback(code, state);
      return res.redirect(`${appUrl}/app/settings/business?connected=1`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Spotify] oauth callback failed: ${message}`);
      return res.redirect(`${appUrl}/app/settings/business?error=oauth_failed`);
    }
  }

  @Get('status')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  getStatus(@CurrentUser('businessId') businessId: string) {
    return this.status.execute(businessId);
  }

  @Delete('disconnect')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  disconnectSpotify(@CurrentUser('businessId') businessId: string) {
    return this.disconnect.execute(businessId);
  }

  @Post('device')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  setDevice(@CurrentUser('businessId') businessId: string, @Body() dto: RegisterSpotifyDeviceDto) {
    return this.registerDevice.execute(businessId, dto.deviceId);
  }

  @Get('player-token')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  getPlayerToken(@CurrentUser('businessId') businessId: string) {
    return this.playerToken.execute(businessId);
  }

  @Patch('music-provider')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  setMusicProvider(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: UpdateMusicProviderDto,
  ) {
    return this.updateProvider.execute(businessId, dto.musicProvider as MusicProvider);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('search')
  @RequirePermissions(Permission.MUSIC_MODERATE)
  search(@CurrentUser('businessId') businessId: string, @Query() dto: SpotifySearchDto) {
    return this.spotify.search(businessId, dto.q);
  }

  @Post('pause')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  pause(@CurrentUser('businessId') businessId: string) {
    return this.spotify.pause(businessId);
  }

  @Post('resume')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  resume(@CurrentUser('businessId') businessId: string) {
    return this.spotify.resume(businessId);
  }

  @Post('skip')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  skip(@CurrentUser('businessId') businessId: string) {
    return this.spotify.skip(businessId);
  }

  @Get('now-playing')
  @RequirePermissions(Permission.MUSIC_PLAYBACK)
  nowPlaying(@CurrentUser('businessId') businessId: string) {
    return this.spotify.getCurrentPlayback(businessId);
  }
}

@Public()
@Controller('public/spotify')
export class PublicSpotifyController {
  constructor(
    private readonly spotify: SpotifyService,
    private readonly spotifyStatus: SpotifyStatusUseCase,
    private readonly playerToken: SpotifyPlayerTokenUseCase,
    private readonly registerDevice: RegisterSpotifyDeviceUseCase,
    private readonly requestSong: RequestSpotifySongUseCase,
    private readonly getBusiness: GetBusinessUseCase,
  ) {}

  @Get(':businessSlug/connection')
  async connection(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    const full = await this.spotifyStatus.execute(business.id);
    return {
      musicProvider: full.musicProvider,
      connected: full.connected,
      hasActiveDevice: full.hasActiveDevice,
    };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(':businessSlug/search')
  async search(@Param('businessSlug') businessSlug: string, @Query() dto: SpotifySearchDto) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.spotify.search(business.id, dto.q);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('request')
  request(@Body() dto: RegisterSpotifySongDto) {
    return this.requestSong.execute(dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':businessSlug/player-token')
  async playerTokenPublic(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.playerToken.execute(business.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':businessSlug/device')
  async devicePublic(
    @Param('businessSlug') businessSlug: string,
    @Body() dto: RegisterSpotifyDeviceDto,
  ) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.registerDevice.execute(business.id, dto.deviceId);
  }
}
