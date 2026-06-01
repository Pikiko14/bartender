/** Estado normalizado de GET /spotify/now-playing (API Web de Spotify). */
export interface SpotifyPlaybackSnapshot {
  spotifyId: string;
  title: string;
  artist: string;
  imageUrl: string | null;
  isPlaying: boolean;
}

export function parseSpotifyPlayback(data: unknown): SpotifyPlaybackSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const item = root.item as Record<string, unknown> | undefined;
  if (!item) return null;

  const rawId = String(item.id ?? '');
  const spotifyId = rawId.includes(':') ? rawId.split(':').pop()! : rawId;
  if (!spotifyId) return null;

  const artists = (item.artists as Array<{ name?: string }> | undefined) ?? [];
  const album = item.album as { images?: Array<{ url?: string }> } | undefined;

  return {
    spotifyId,
    title: String(item.name ?? 'Sin título'),
    artist: artists.map((a) => a.name).filter(Boolean).join(', ') || '—',
    imageUrl: album?.images?.[0]?.url ?? null,
    isPlaying: root.is_playing === true,
  };
}
