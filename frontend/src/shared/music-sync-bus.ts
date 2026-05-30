import type { MusicRequest } from '@/shared/types';

const CHANNEL = 'bartender-music-sync';

export type MusicSyncMessage = {
  type: 'now-playing';
  businessId: string;
  track: MusicRequest | null;
};

/** Sincroniza nowPlaying entre pestañas (Música admin ↔ pantalla DJ). */
export function broadcastNowPlaying(businessId: string, track: MusicRequest | null): void {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: 'now-playing', businessId, track } satisfies MusicSyncMessage);
    channel.close();
  } catch {
    /* BroadcastChannel no disponible */
  }
}

export function onNowPlayingBroadcast(
  handler: (msg: MusicSyncMessage) => void,
): () => void {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev: MessageEvent<MusicSyncMessage>) => {
      if (ev.data?.type === 'now-playing') handler(ev.data);
    };
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}
