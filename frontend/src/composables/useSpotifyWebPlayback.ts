declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (payload: unknown) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  setVolume(volume: number): Promise<void>;
}

export interface SpotifyPlaybackState {
  paused: boolean;
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string; images: Array<{ url: string }> };
      duration_ms: number;
    };
  };
}

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

let sdkPromise: Promise<void> | null = null;

export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify?.Player) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) return;
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('No se pudo cargar Spotify Web Playback SDK'));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export async function createSpotifyPlayer(options: {
  name: string;
  getToken: () => Promise<string>;
}): Promise<{ player: SpotifyPlayerInstance; deviceId: string }> {
  await loadSpotifySdk();
  if (!window.Spotify?.Player) {
    throw new Error('Spotify Web Playback SDK no disponible');
  }

  let token = await options.getToken();

  const player = new window.Spotify.Player({
    name: options.name,
    getOAuthToken: (cb) => cb(token),
    volume: 1,
  });

  return new Promise((resolve, reject) => {
    let deviceId = '';

    player.addListener('ready', (payload: unknown) => {
      const { device_id } = payload as { device_id: string };
      deviceId = device_id;
      resolve({ player, deviceId });
    });

    player.addListener('not_ready', (payload: unknown) => {
      const { device_id } = payload as { device_id: string };
      console.warn('[Spotify] Device not ready:', device_id);
    });

    player.addListener('authentication_error', (payload: unknown) => {
      const { message } = payload as { message: string };
      reject(new Error(message || 'Error de autenticación Spotify'));
    });

    player.addListener('account_error', (payload: unknown) => {
      const { message } = payload as { message: string };
      reject(new Error(message || 'Se requiere Spotify Premium'));
    });

    player.addListener('initialization_error', (payload: unknown) => {
      const { message } = payload as { message: string };
      reject(new Error(message || 'Error inicializando reproductor Spotify'));
    });

    void player.connect().then((ok) => {
      if (!ok) reject(new Error('No se pudo conectar el reproductor Spotify'));
    });

    // Renovar token periódicamente
    setInterval(async () => {
      try {
        token = await options.getToken();
      } catch {
        /* ignore */
      }
    }, 45 * 60 * 1000);
  });
}
