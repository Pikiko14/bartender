import { publicApi } from '@/services/api';
import type { YoutubeVideo } from '@/shared/types';

/** Videos que fallaron por bloqueo de embed (101/150 o embeddable=false). */
export const blockedVideoCache = new Set<string>();

/** Mapeo original → alternativa embeddable encontrada. */
const alternativeCache = new Map<string, string>();

/** Resolución ya calculada por ítem de cola (id de MusicRequest). */
const trackResolutionCache = new Map<string, ResolvePlaybackResult>();

/** Promesas en vuelo para no duplicar búsquedas del mismo tema. */
const resolveInFlight = new Map<string, Promise<ResolvePlaybackResult>>();

export const YT_EMBED_BLOCKED_CODES = [101, 150] as const;

export type PlaybackSource = {
  youtubeId: string;
  title: string;
  channelTitle?: string | null;
  trackId?: string;
};

export type ResolvePlaybackResult =
  | { ok: true; youtubeId: string; title: string; alternative: boolean }
  | { ok: false; external: true; youtubeId: string; title: string };

export function isKnownBlocked(videoId: string): boolean {
  return blockedVideoCache.has(videoId);
}

export function markBlocked(videoId: string): void {
  blockedVideoCache.add(videoId);
}

export function isEmbedBlockedError(code: number): boolean {
  return (YT_EMBED_BLOCKED_CODES as readonly number[]).includes(code);
}

export async function isEmbeddable(videoId: string): Promise<boolean> {
  if (!videoId || isKnownBlocked(videoId)) return false;

  try {
    const { embeddable } = await publicApi.musicEmbeddable(videoId);
    if (!embeddable) markBlocked(videoId);
    return embeddable;
  } catch {
    // Si la API no responde, intentar reproducir y capturar onError.
    return true;
  }
}

export async function findAlternativeVideo(
  songName: string,
  artist?: string | null,
): Promise<YoutubeVideo | null> {
  console.log('[YOUTUBE] Buscando alternativa...');
  try {
    const alt = await publicApi.musicAlternative(songName, artist ?? undefined);
    if (alt?.youtubeId) {
      console.log('[YOUTUBE] Alternativa encontrada:', alt.youtubeId);
    }
    return alt;
  } catch {
    return null;
  }
}

export async function handleBlockedVideo(
  source: PlaybackSource,
  options: { openExternal?: boolean } = {},
): Promise<ResolvePlaybackResult> {
  console.log('[YOUTUBE] Video bloqueado:', source.youtubeId);
  markBlocked(source.youtubeId);

  const alt = await findAlternativeVideo(source.title, source.channelTitle);
  if (alt?.youtubeId) {
    alternativeCache.set(source.youtubeId, alt.youtubeId);
    return {
      ok: true,
      youtubeId: alt.youtubeId,
      title: alt.title,
      alternative: true,
    };
  }

  if (options.openExternal !== false) {
    console.log('[YOUTUBE] Fallback externo activado');
    window.open(`https://www.youtube.com/watch?v=${source.youtubeId}`, '_blank');
  }
  return {
    ok: false,
    external: true,
    youtubeId: source.youtubeId,
    title: source.title,
  };
}

export function clearTrackResolution(trackId: string): void {
  trackResolutionCache.delete(trackId);
  resolveInFlight.delete(trackId);
}

export function getCachedTrackResolution(trackId: string): ResolvePlaybackResult | undefined {
  return trackResolutionCache.get(trackId);
}

function cacheTrackResolution(trackId: string, result: ResolvePlaybackResult): void {
  trackResolutionCache.set(trackId, result);
}

/** Precalcula embeddable/alternativa en segundo plano (sin reproducir). */
export async function prefetchTrackForPlayback(source: PlaybackSource): Promise<ResolvePlaybackResult> {
  return resolveTrackForPlayback(source);
}

/** Valida antes de montar el iframe y resuelve alternativas si hace falta. */
export async function resolveTrackForPlayback(source: PlaybackSource): Promise<ResolvePlaybackResult> {
  if (source.trackId) {
    const cached = trackResolutionCache.get(source.trackId);
    if (cached) return cached;

    const inflight = resolveInFlight.get(source.trackId);
    if (inflight) return inflight;
  }

  const promise = resolveTrackForPlaybackInner(source);
  if (source.trackId) {
    resolveInFlight.set(source.trackId, promise);
    promise.finally(() => resolveInFlight.delete(source.trackId!));
  }
  return promise;
}

async function resolveTrackForPlaybackInner(source: PlaybackSource): Promise<ResolvePlaybackResult> {
  const cachedAlt = alternativeCache.get(source.youtubeId);
  if (cachedAlt && !isKnownBlocked(cachedAlt)) {
    const result: ResolvePlaybackResult = {
      ok: true,
      youtubeId: cachedAlt,
      title: source.title,
      alternative: true,
    };
    if (source.trackId) cacheTrackResolution(source.trackId, result);
    return result;
  }

  if (isKnownBlocked(source.youtubeId)) {
    const result = await handleBlockedVideo(source);
    if (source.trackId) cacheTrackResolution(source.trackId, result);
    return result;
  }

  const embeddable = await isEmbeddable(source.youtubeId);
  if (!embeddable) {
    const result = await handleBlockedVideo(source);
    if (source.trackId) cacheTrackResolution(source.trackId, result);
    return result;
  }

  const result: ResolvePlaybackResult = {
    ok: true,
    youtubeId: source.youtubeId,
    title: source.title,
    alternative: false,
  };
  if (source.trackId) cacheTrackResolution(source.trackId, result);
  return result;
}