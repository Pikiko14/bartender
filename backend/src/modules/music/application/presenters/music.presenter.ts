import { MusicProvider } from '@shared/enums/music-provider.enum';
import { MusicRequest, MusicRequestStatus } from '../../domain/entities/music-request.entity';

export interface MusicRequestView {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string | null;
  channelTitle: string | null;
  durationSeconds: number | null;
  requestedBy: string;
  status: MusicRequestStatus;
  priority: number;
  votes: number;
  playedAt: Date | null;
  createdAt?: Date;
  provider: MusicProvider;
  spotifyId: string | null;
  artist: string | null;
  album: string | null;
}

export function presentMusicRequest(request: MusicRequest): MusicRequestView {
  const p = request.toPrimitives();
  return {
    id: p.id,
    title: p.title,
    youtubeId: p.youtubeId,
    thumbnail: p.thumbnail,
    channelTitle: p.channelTitle,
    durationSeconds: p.durationSeconds,
    requestedBy: p.requestedBy,
    status: p.status,
    priority: p.priority,
    votes: p.votes,
    playedAt: p.playedAt,
    createdAt: p.createdAt,
    provider: p.provider,
    spotifyId: p.spotifyId,
    artist: p.artist,
    album: p.album,
  };
}
