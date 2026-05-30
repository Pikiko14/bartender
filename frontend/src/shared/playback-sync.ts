/** Comando de play/pause sincronizado entre todos los reproductores del negocio. */
export type PlaybackSyncCommand = {
  action: 'play' | 'pause';
  youtubeId: string;
  at?: number;
};

type Handler = (cmd: PlaybackSyncCommand) => void;

const handlers = new Set<Handler>();

export function onPlaybackSync(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function dispatchPlaybackSync(cmd: PlaybackSyncCommand): void {
  handlers.forEach((h) => h(cmd));
}
