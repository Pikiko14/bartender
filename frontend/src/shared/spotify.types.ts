export type MusicProvider = 'YOUTUBE' | 'SPOTIFY';

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  imageUrl: string | null;
  provider: 'SPOTIFY';
}

export interface SpotifyConnectionStatus {
  musicProvider: MusicProvider;
  connected: boolean;
  spotifyUserId: string | null;
  spotifyDisplayName: string | null;
  spotifyDeviceId: string | null;
  spotifyConnectedAt: string | null;
  spotifyLastSyncAt: string | null;
  hasActiveDevice: boolean;
}

export interface SpotifyPlayerToken {
  accessToken: string;
  expiresAt: string;
}
