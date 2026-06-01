import { MusicProvider } from '@shared/enums/music-provider.enum';

export interface SpotifyTrackView {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  imageUrl: string | null;
  provider: MusicProvider.SPOTIFY;
}

export interface SpotifyConnectionView {
  musicProvider: MusicProvider;
  connected: boolean;
  spotifyUserId: string | null;
  spotifyDisplayName: string | null;
  spotifyDeviceId: string | null;
  spotifyConnectedAt: string | null;
  spotifyLastSyncAt: string | null;
  hasActiveDevice: boolean;
}

export interface SpotifyPlayerTokenView {
  accessToken: string;
  expiresAt: string;
}

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'user-read-email',
  'user-read-private',
].join(' ');
