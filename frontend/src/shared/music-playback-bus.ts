/** Aviso a pantallas DJ/TV: nowPlaying cambió → aplicar al reproductor. */
const listeners = new Set<() => void>();

export function onMusicPlaybackChanged(handler: () => void): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function notifyMusicPlaybackChanged(): void {
  for (const handler of listeners) {
    try {
      handler();
    } catch {
      /* ignore */
    }
  }
}
