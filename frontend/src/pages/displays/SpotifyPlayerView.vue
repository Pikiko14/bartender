<template>
  <div class="min-h-screen bg-ink-950 p-4 sm:p-6">
    <div class="mx-auto max-w-2xl">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-neon-cyan">🎧 Reproductor Spotify</h1>
          <p class="mt-1 text-sm text-slate-400">
            Mantén esta ventana abierta en la tablet/PC conectada al sonido del local.
          </p>
        </div>
        <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
      </header>

      <div v-if="error" class="card mb-4 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {{ error }}
      </div>

      <div class="card p-5">
        <h2 class="font-semibold">Estado de conexión</h2>
        <ul class="mt-3 space-y-2 text-sm text-slate-300">
          <li>Dispositivo: <span class="text-white">{{ deviceId || '—' }}</span></li>
          <li>Última sync: <span class="text-white">{{ lastSync || '—' }}</span></li>
          <li v-if="music.queue.length">
            En cola: <span class="text-white">{{ music.queue.length }}</span>
          </li>
        </ul>

        <div v-if="currentTrack" class="mt-5 flex items-center gap-3 rounded-lg bg-ink-800 p-3">
          <img
            v-if="currentTrack.imageUrl"
            :src="currentTrack.imageUrl"
            class="h-14 w-14 rounded object-cover"
            alt=""
          />
          <div class="min-w-0">
            <p class="truncate font-semibold">{{ currentTrack.title }}</p>
            <p class="truncate text-xs text-slate-400">{{ currentTrack.artist }}</p>
            <p class="mt-1 text-xs" :class="isPlaying ? 'text-neon-cyan' : 'text-slate-500'">
              {{ isPlaying ? '▶ Reproduciendo' : '⏸ Pausado' }}
            </p>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button type="button" class="btn-cyan text-sm" :disabled="connecting" @click="reconnect">
            {{ connecting ? 'Conectando…' : 'Reconectar' }}
          </button>
          <RouterLink v-if="!isPublic" to="/app/settings/profile" class="btn-ghost text-sm">
            ← Configuración música
          </RouterLink>
        </div>
      </div>

      <p class="mt-4 text-xs text-slate-500">
        Requiere cuenta Spotify Premium conectada al establecimiento. Al terminar una canción pasa
        automáticamente a la siguiente de la cola Bartender.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { createSpotifyPlayer, type SpotifyPlayerInstance } from '@/composables/useSpotifyWebPlayback';
import { businessApi, publicSpotifyApi, spotifyApi } from '@/services/api';
import { apiErrorMessage } from '@/services/http';
import { realtime, SocketEvents } from '@/socket/socket';
import { useAuthStore } from '@/stores/auth.store';
import { useMusicStore } from '@/stores/music.store';

const route = useRoute();
const auth = useAuthStore();
const music = useMusicStore();
const isPublic = computed(() => !!route.params.businessSlug);
const businessSlug = computed(() => String(route.params.businessSlug ?? ''));

const connecting = ref(false);
const connected = ref(false);
const deviceId = ref('');
const lastSync = ref('');
const error = ref('');
const isPlaying = ref(false);
const currentTrack = ref<{ title: string; artist: string; imageUrl: string | null } | null>(null);

let player: SpotifyPlayerInstance | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let advancing = false;
let advanceTimer: ReturnType<typeof setTimeout> | null = null;
let lastTrackUri = '';
/** Evita playNext espurio al reconectar (F5) antes de estabilizar el estado. */
let canAutoAdvance = false;
let reconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;

const statusLabel = computed(() => {
  if (connecting.value) return 'Conectando…';
  if (connected.value) return '● Conectado';
  return 'Desconectado';
});

const statusBadgeClass = computed(() =>
  connected.value ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300',
);

async function fetchToken(): Promise<string> {
  if (isPublic.value && businessSlug.value) {
    const t = await publicSpotifyApi.playerToken(businessSlug.value);
    return t.accessToken;
  }
  const t = await spotifyApi.playerToken();
  return t.accessToken;
}

async function registerDevice(id: string) {
  if (isPublic.value && businessSlug.value) {
    await publicSpotifyApi.registerDevice(businessSlug.value, id);
  } else {
    await spotifyApi.registerDevice(id);
  }
  lastSync.value = new Date().toLocaleTimeString();
}

function beginReconnectGrace() {
  canAutoAdvance = false;
  if (reconnectGraceTimer) clearTimeout(reconnectGraceTimer);
  reconnectGraceTimer = setTimeout(() => {
    reconnectGraceTimer = null;
    canAutoAdvance = true;
  }, 4000);
}

async function advanceQueue() {
  if (advancing || !canAutoAdvance) return;
  const hasQueue = music.queue.length > 0 || music.nowPlaying;
  if (!hasQueue) return;

  advancing = true;
  try {
    if (isPublic.value && businessSlug.value) {
      await music.playNextPublic(businessSlug.value);
    } else {
      await music.playNext();
    }
    lastSync.value = new Date().toLocaleTimeString();
  } catch {
    /* Cola vacía o sin reproductor: no es un error fatal. */
  } finally {
    advancing = false;
  }
}

function scheduleAdvanceOnEnd() {
  if (!canAutoAdvance) return;
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    void advanceQueue();
  }, 600);
}

function handlePlayerState(state: unknown) {
  const s = state as {
    paused?: boolean;
    position?: number;
    duration?: number;
    track_window?: {
      current_track?: {
        uri?: string;
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { images: Array<{ url: string }> };
      };
    };
  } | null;

  if (!s?.track_window?.current_track) {
    if (lastTrackUri && canAutoAdvance) scheduleAdvanceOnEnd();
    currentTrack.value = null;
    isPlaying.value = false;
    lastTrackUri = '';
    return;
  }

  const t = s.track_window.current_track;
  const trackUri = t.uri ?? t.id;
  const spotifyId = t.id?.includes(':') ? t.id.split(':').pop()! : t.id;

  currentTrack.value = {
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    imageUrl: t.album.images[0]?.url ?? null,
  };
  isPlaying.value = !s.paused;

  const duration = s.duration ?? 0;
  const position = s.position ?? 0;
  if (canAutoAdvance && duration > 0 && position > 0 && position >= duration - 1500) {
    scheduleAdvanceOnEnd();
  }

  lastTrackUri = trackUri;

  if (!isPublic.value && auth.user?.businessId && spotifyId) {
    void music.trySyncFromSpotifyTrack(spotifyId);
  }
}

async function reconnect() {
  connecting.value = true;
  error.value = '';
  beginReconnectGrace();
  try {
    player?.disconnect();
    const result = await createSpotifyPlayer({
      name: `Bartender ${businessSlug.value || 'Player'}`,
      getToken: fetchToken,
    });
    player = result.player;
    deviceId.value = result.deviceId;
    await registerDevice(result.deviceId);
    connected.value = true;

    player.addListener('player_state_changed', handlePlayerState);
  } catch (e) {
    error.value = apiErrorMessage(e);
    connected.value = false;
  } finally {
    connecting.value = false;
  }
}

onMounted(async () => {
  try {
    if (isPublic.value && businessSlug.value) {
      const biz = await businessApi.publicBySlug(businessSlug.value);
      music.bindBusiness(biz.id);
      await music.fetchPublicQueue(businessSlug.value);
    } else if (auth.user?.businessId) {
      music.bindBusiness(auth.user.businessId);
      await music.fetchQueue().catch(() => undefined);
    }
  } catch (e) {
    error.value = apiErrorMessage(e);
  }

  await reconnect();
  pollTimer = setInterval(() => {
    if (!connected.value && !connecting.value) void reconnect();
  }, 30_000);

  realtime.on(SocketEvents.MUSIC_PLAYING, () => {
    lastSync.value = new Date().toLocaleTimeString();
  });
  realtime.on(SocketEvents.MUSIC_QUEUE_UPDATED, () => {
    lastSync.value = new Date().toLocaleTimeString();
  });
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (advanceTimer) clearTimeout(advanceTimer);
  if (reconnectGraceTimer) clearTimeout(reconnectGraceTimer);
  player?.disconnect();
});
</script>
