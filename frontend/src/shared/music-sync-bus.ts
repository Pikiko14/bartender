import type { MusicQueue, MusicRequest } from '@/shared/types';

const CHANNEL = 'bartender-music-sync';

export type MusicSyncMessage =
  | {
      type: 'now-playing';
      businessId: string;
      track: MusicRequest | null;
    }
  | {
      type: 'queue-updated';
      businessId: string;
      queue: MusicQueue;
    };

function postMessage(message: MusicSyncMessage): void {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    /* BroadcastChannel no disponible */
  }
}

/** Sincroniza nowPlaying entre pestañas (Música admin ↔ pantalla DJ). */
export function broadcastNowPlaying(businessId: string, track: MusicRequest | null): void {
  postMessage({ type: 'now-playing', businessId, track });
}

/** Sincroniza cola completa entre pestañas. */
export function broadcastQueueState(businessId: string, queue: MusicQueue): void {
  postMessage({ type: 'queue-updated', businessId, queue });
}

export function onMusicSyncBroadcast(handler: (msg: MusicSyncMessage) => void): () => void {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev: MessageEvent<MusicSyncMessage>) => {
      const data = ev.data;
      if (data?.type === 'now-playing' || data?.type === 'queue-updated') handler(data);
    };
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}

/** @deprecated Usa onMusicSyncBroadcast */
export function onNowPlayingBroadcast(
  handler: (msg: Extract<MusicSyncMessage, { type: 'now-playing' }>) => void,
): () => void {
  return onMusicSyncBroadcast((msg) => {
    if (msg.type === 'now-playing') handler(msg);
  });
}
