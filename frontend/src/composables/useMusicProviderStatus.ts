import { computed, ref } from 'vue';
import { spotifyApi } from '@/services/api';
import type { SpotifyConnectionStatus } from '@/shared/spotify.types';

export function useMusicProviderStatus() {
  const status = ref<SpotifyConnectionStatus | null>(null);
  const loading = ref(false);

  const musicProvider = computed(() => status.value?.musicProvider ?? 'YOUTUBE');
  const isSpotifyProvider = computed(() => musicProvider.value === 'SPOTIFY');

  async function refresh() {
    loading.value = true;
    try {
      status.value = await spotifyApi.status();
    } catch {
      status.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { status, loading, musicProvider, isSpotifyProvider, refresh };
}
