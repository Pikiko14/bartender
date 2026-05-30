import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { MUSIC_REQUEST_REPOSITORY } from './domain/repositories/music-request.repository';
import { GetQueueUseCase } from './application/use-cases/get-queue.use-case';
import { ModerateMusicUseCase } from './application/use-cases/moderate-music.use-case';
import { PlaybackUseCase } from './application/use-cases/playback.use-case';
import { RequestSongUseCase } from './application/use-cases/request-song.use-case';
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
  ],
  controllers: [MusicController, PublicMusicController],
  providers: [
    YoutubeService,
    GetQueueUseCase,
    RequestSongUseCase,
    VoteSongUseCase,
    ModerateMusicUseCase,
    PlaybackUseCase,
    { provide: MUSIC_REQUEST_REPOSITORY, useClass: MusicRequestMongoRepository },
  ],
  exports: [MUSIC_REQUEST_REPOSITORY],
})
export class MusicModule {}
