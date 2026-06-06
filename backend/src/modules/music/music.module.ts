import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { SpotifyModule } from '@modules/spotify/spotify.module';
import { MUSIC_REQUEST_REPOSITORY } from './domain/repositories/music-request.repository';
import { GetQueueUseCase } from './application/use-cases/get-queue.use-case';
import { ModerateMusicUseCase } from './application/use-cases/moderate-music.use-case';
import { PlaybackUseCase } from './application/use-cases/playback.use-case';
import { RequestSongUseCase } from './application/use-cases/request-song.use-case';
import { EnqueuePlaylistUseCase } from './application/use-cases/enqueue-playlist.use-case';
import { EnqueueSongUseCase } from './application/use-cases/enqueue-song.use-case';
import { ResolveMusicPlaybackUseCase } from './application/use-cases/resolve-music-playback.use-case';
import { SyncSpotifyQueueUseCase } from './application/use-cases/sync-spotify-queue.use-case';
import { VoteSongUseCase } from './application/use-cases/vote-song.use-case';
import { MusicController } from './infrastructure/controllers/music.controller';
import { PublicMusicController } from './infrastructure/controllers/public-music.controller';
import { MusicRequestMongoRepository } from './infrastructure/repositories/music-request.mongo.repository';
import {
  MusicRequestModel,
  MusicRequestSchema,
} from './infrastructure/schemas/music-request.schema';
import { YoutubeService } from './infrastructure/services/youtube.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MusicRequestModel.name, schema: MusicRequestSchema }]),
    SessionsModule,
    BusinessModule,
    forwardRef(() => SpotifyModule),
  ],
  controllers: [MusicController, PublicMusicController],
  providers: [
    YoutubeService,
    GetQueueUseCase,
    RequestSongUseCase,
    VoteSongUseCase,
    ModerateMusicUseCase,
    EnqueueSongUseCase,
    EnqueuePlaylistUseCase,
    PlaybackUseCase,
    SyncSpotifyQueueUseCase,
    ResolveMusicPlaybackUseCase,
    { provide: MUSIC_REQUEST_REPOSITORY, useClass: MusicRequestMongoRepository },
  ],
  exports: [MUSIC_REQUEST_REPOSITORY, GetQueueUseCase],
})
export class MusicModule {}
