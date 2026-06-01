import { Module, forwardRef } from '@nestjs/common';
import { BusinessModule } from '@modules/business/business.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { MusicModule } from '@modules/music/music.module';
import { SpotifyOAuthUseCase } from './application/use-cases/spotify-oauth.use-case';
import { RequestSpotifySongUseCase } from './application/use-cases/request-spotify-song.use-case';
import {
  RegisterSpotifyDeviceUseCase,
  SpotifyDisconnectUseCase,
  SpotifyPlayerTokenUseCase,
  SpotifyStatusUseCase,
  UpdateMusicProviderUseCase,
} from './application/use-cases/spotify-settings.use-case';
import { SpotifyController, PublicSpotifyController } from './infrastructure/controllers/spotify.controller';
import {
  SpotifyService,
  SpotifyTokenService,
} from './infrastructure/services/spotify.service';
import { SpotifyPlaybackBridge } from './infrastructure/services/spotify-playback.bridge';

@Module({
  imports: [BusinessModule, SessionsModule, forwardRef(() => MusicModule)],
  controllers: [SpotifyController, PublicSpotifyController],
  providers: [
    SpotifyTokenService,
    SpotifyService,
    SpotifyPlaybackBridge,
    SpotifyOAuthUseCase,
    SpotifyStatusUseCase,
    SpotifyDisconnectUseCase,
    RegisterSpotifyDeviceUseCase,
    SpotifyPlayerTokenUseCase,
    UpdateMusicProviderUseCase,
    RequestSpotifySongUseCase,
  ],
  exports: [SpotifyService, SpotifyPlaybackBridge, SpotifyPlayerTokenUseCase],
})
export class SpotifyModule {}
