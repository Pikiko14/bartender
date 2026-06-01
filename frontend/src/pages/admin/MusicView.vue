<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Música</h1>
        <p class="text-sm text-slate-400">
          {{
            isSpotifyProvider
              ? 'Aprueba peticiones y gestiona la cola · el audio suena en el reproductor Spotify.'
              : 'Aprueba peticiones y gestiona la cola · el audio suena en la pantalla DJ.'
          }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          v-if="!isSpotifyProvider && shareUrl"
          :href="shareUrl"
          target="_blank"
          class="btn-ghost text-sm text-neon-cyan"
        >
          ↗ Pantalla DJ
        </a>
        <a
          v-else-if="!isSpotifyProvider"
          href="/dj"
          target="_blank"
          class="btn-ghost text-sm text-neon-cyan"
        >
          ↗ Pantalla DJ
        </a>
        <a
          v-if="isSpotifyProvider"
          href="/spotify-player"
          target="_blank"
          class="btn-ghost text-sm text-neon-cyan"
        >
          ↗ Reproductor Spotify
        </a>
      </div>
    </div>

    <div
      v-if="isSpotifyProvider"
      class="mt-4 card flex flex-wrap items-center justify-between gap-3 border border-neon-cyan/20 bg-neon-cyan/5 p-3 text-sm"
    >
      <span class="text-slate-300">
        Cola Bartender → usa «Sincronizar» para ver las mismas canciones en la fila de Spotify.
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-cyan text-xs"
          :disabled="syncingSpotify || !music.queue.length && !music.nowPlaying"
          @click="syncSpotifyQueue"
        >
          {{ syncingSpotify ? '…' : '↻ Sincronizar con Spotify' }}
        </button>
        <RouterLink :to="providerSettingsPath" class="btn-ghost text-xs text-neon-cyan">
          Configurar proveedor →
        </RouterLink>
      </div>
    </div>
    <div
      v-else-if="canManageProvider"
      class="mt-4 card flex flex-wrap items-center justify-between gap-3 border border-ink-700 p-3 text-sm text-slate-400"
    >
      <span>Reproducción vía pantalla DJ (YouTube).</span>
      <RouterLink :to="providerSettingsPath" class="btn-ghost text-xs text-neon-cyan">
        Configurar proveedor →
      </RouterLink>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="card p-5 lg:col-span-2">
        <h2 class="font-semibold">Cola aprobada ({{ music.queue.length }})</h2>

        <div
          v-if="music.nowPlaying"
          class="mt-3 overflow-hidden rounded-lg ring-1 ring-neon-cyan/30"
        >
          <div class="flex items-center gap-3 bg-neon-cyan/5 p-3">
            <img
              :src="music.nowPlaying.thumbnail ?? ''"
              class="h-12 w-20 shrink-0 rounded object-cover"
              alt=""
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium uppercase tracking-wide text-neon-cyan">Sonando ahora</p>
              <p class="truncate text-sm font-semibold">{{ music.nowPlaying.title }}</p>
              <p v-if="music.nowPlaying.artist" class="truncate text-xs text-slate-400">
                {{ music.nowPlaying.artist }}
              </p>
              <p v-if="music.queue[0]" class="mt-0.5 truncate text-xs text-slate-400">
                Después: {{ music.queue[0].title }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 border-t border-neon-cyan/20 bg-ink-900/50 p-3">
            <button type="button" class="btn-cyan text-sm" @click="togglePlayback">
              {{ isPlaying ? '⏸ Pausar' : '▶ Reproducir' }}
            </button>
            <button type="button" class="btn-ghost text-sm" @click="skipTrack">⏭ Saltar</button>
            <button
              type="button"
              class="btn-ghost text-sm"
              :disabled="!music.queue.length"
              @click="nextTrack"
            >
              ▶ Siguiente
            </button>
          </div>
        </div>

        <div
          v-else-if="isSpotifyProvider && spotifyLive"
          class="mt-3 overflow-hidden rounded-lg ring-1 ring-amber-500/30"
        >
          <div class="flex items-center gap-3 bg-amber-500/5 p-3">
            <img
              :src="spotifyLive.imageUrl ?? ''"
              class="h-12 w-20 shrink-0 rounded object-cover"
              alt=""
            />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium uppercase tracking-wide text-amber-300">
                Sonando en Spotify
              </p>
              <p class="truncate text-sm font-semibold">{{ spotifyLive.title }}</p>
              <p class="truncate text-xs text-slate-400">{{ spotifyLive.artist }}</p>
              <p class="mt-1 text-xs text-slate-500">
                Fuera de la cola Bartender · aprueba peticiones o usa ▶ Siguiente para la cola.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 border-t border-amber-500/20 bg-ink-900/50 p-3">
            <button type="button" class="btn-cyan text-sm" @click="toggleSpotifyPlayback">
              {{ spotifyLive.isPlaying ? '⏸ Pausar' : '▶ Reproducir' }}
            </button>
            <button type="button" class="btn-ghost text-sm" @click="skipSpotifyTrack">⏭ Saltar</button>
            <button
              type="button"
              class="btn-ghost text-sm"
              :disabled="!music.queue.length"
              @click="nextTrack"
            >
              ▶ Siguiente (cola)
            </button>
          </div>
        </div>

        <div
          v-else-if="music.queue.length"
          class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink-800 p-3"
        >
          <p class="text-sm text-slate-400">Cola lista · nada sonando aún.</p>
          <button type="button" class="btn-primary text-sm" @click="nextTrack">▶ Iniciar cola</button>
        </div>

        <ul class="mt-3 space-y-2">
          <li
            v-for="(s, i) in music.queue"
            :key="s.id"
            class="flex items-center gap-3 rounded-lg bg-ink-800 p-2"
            :class="i === 0 ? 'ring-1 ring-neon-cyan/40' : ''"
          >
            <img :src="s.thumbnail ?? ''" class="h-10 w-16 shrink-0 rounded object-cover" alt="" />
            <span class="flex-1 truncate text-sm">{{ s.title }}</span>
            <span class="badge bg-ink-700 text-slate-400">▲ {{ s.votes }}</span>
            <button
              type="button"
              class="btn-cyan shrink-0 px-2 py-1 text-xs"
              :disabled="playingId === s.id"
              @click="playNow(s.id)"
            >
              {{ playingId === s.id ? '…' : '▶ Ahora' }}
            </button>
          </li>
          <li
            v-if="!music.nowPlaying && !spotifyLive && !music.queue.length"
            class="py-8 text-center text-sm text-slate-500"
          >
            {{
              isSpotifyProvider
                ? 'Cola vacía · aprueba peticiones o pulsa ▶ Siguiente para iniciar en Spotify.'
                : 'Cola vacía · aprueba peticiones o abre la pantalla DJ para iniciar.'
            }}
          </li>
        </ul>
      </div>

      <div class="card p-5">
        <h2 class="font-semibold">Por aprobar ({{ music.pending.length }})</h2>
        <ul class="mt-3 space-y-3">
          <li v-for="s in music.pending" :key="s.id" class="rounded-lg bg-ink-800 p-3">
            <div class="flex items-center gap-3">
              <img :src="s.thumbnail ?? ''" class="h-10 w-16 rounded object-cover" alt="" />
              <span class="flex-1 truncate text-sm">{{ s.title }}</span>
            </div>
            <div class="mt-2 flex gap-2">
              <button class="btn-primary flex-1 py-1.5 text-xs" @click="approve(s.id)">Aprobar</button>
              <button class="btn-ghost flex-1 py-1.5 text-xs text-red-400" @click="reject(s.id)">
                Rechazar
              </button>
            </div>
          </li>
          <li v-if="!music.pending.length" class="text-sm text-slate-500">Sin peticiones pendientes.</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useMusicStore } from '@/stores/music.store';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { useMusicProviderStatus } from '@/composables/useMusicProviderStatus';
import { musicApi, spotifyApi } from '@/services/api';
import { djShareUrl } from '@/shared/dj-share';
import { onMusicSyncBroadcast } from '@/shared/music-sync-bus';
import { onPlaybackSync } from '@/shared/playback-sync';
import { parseSpotifyPlayback, type SpotifyPlaybackSnapshot } from '@/shared/spotify-playback';

const music = useMusicStore();
const auth = useAuthStore();
const business = useBusinessStore();
const toast = useToast();
const { isSpotifyProvider, refresh: refreshProviderStatus } = useMusicProviderStatus();
const playingId = ref<string | null>(null);
const isPlaying = ref(true);
const busy = ref(false);
const syncingSpotify = ref(false);
const spotifyLive = ref<SpotifyPlaybackSnapshot | null>(null);
let unregPlaybackSync: (() => void) | undefined;
let unregMusicSync: (() => void) | undefined;
let spotifyPollTimer: ReturnType<typeof setInterval> | undefined;

const businessSlug = computed(() => business.current?.slug ?? '');
const shareUrl = computed(() => (businessSlug.value ? djShareUrl(businessSlug.value) : ''));
const canManageProvider = computed(() => auth.can('music:playback'));
const providerSettingsPath = computed(() =>
  auth.can('business:manage') ? '/app/settings/business' : '/app/settings/profile',
);

function togglePlayback() {
  const businessId = auth.user?.businessId;
  const track = music.nowPlaying;
  if (!businessId || !track) return;
  if (isSpotifyProvider.value && track.provider === 'SPOTIFY') {
    void toggleSpotifyPlayback();
    return;
  }
  const action = isPlaying.value ? 'pause' : 'play';
  music.sendPlaybackControl(businessId, { action, youtubeId: track.youtubeId });
  isPlaying.value = action === 'play';
}

async function refreshSpotifyLive() {
  if (!isSpotifyProvider.value) {
    spotifyLive.value = null;
    return;
  }
  try {
    const raw = await spotifyApi.nowPlaying();
    spotifyLive.value = parseSpotifyPlayback(raw);
    if (spotifyLive.value && !music.nowPlaying) {
      await music.trySyncFromSpotifyTrack(spotifyLive.value.spotifyId);
    }
  } catch {
    spotifyLive.value = null;
  }
}

async function toggleSpotifyPlayback() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (spotifyLive.value?.isPlaying ?? isPlaying.value) {
      await spotifyApi.pause();
    } else {
      await spotifyApi.resume();
    }
    await refreshSpotifyLive();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

async function skipSpotifyTrack() {
  if (busy.value) return;
  busy.value = true;
  try {
    await runSpotifyQueueAction('skip');
    toast.success('Siguiente canción.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

watch(
  () => music.nowPlaying?.id,
  () => {
    isPlaying.value = true;
  },
);

async function runSpotifyQueueAction(action: 'skip' | 'next') {
  if (action === 'skip' && music.nowPlaying) {
    await music.skip();
  } else if (music.queue.length) {
    const playing = await music.playNext();
    if (!playing) toast.info('No hay más canciones en la cola.');
  } else if (action === 'skip') {
    await spotifyApi.skip();
    await music.fetchQueue();
  } else {
    toast.info('Aprueba canciones o añádelas a la cola antes de reproducir.');
    return;
  }
  await refreshSpotifyLive();
}

async function skipTrack() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (isSpotifyProvider.value) {
      await runSpotifyQueueAction('skip');
      toast.success('Siguiente canción.');
      return;
    }
    await music.skip();
    notifyDjPlayback();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

async function nextTrack() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (isSpotifyProvider.value) {
      await runSpotifyQueueAction('next');
      toast.success('Reproduciendo cola en Spotify.');
      return;
    }
    const playing = await music.playNext();
    if (!playing) toast.info('Cola vacía · aprueba peticiones primero.');
    notifyDjPlayback();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

function notifyDjPlayback() {
  const businessId = auth.user?.businessId;
  if (businessId) music.notifyPlayback(businessId);
}

async function playNow(id: string) {
  if (music.nowPlaying?.id === id) return;
  playingId.value = id;
  try {
    await music.playRequest(id);
    await refreshSpotifyLive();
    toast.success(
      isSpotifyProvider.value
        ? 'Reproduciendo en Spotify (reproductor abierto).'
        : 'Reproduciendo en pantalla DJ.',
    );
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    playingId.value = null;
  }
}

async function syncSpotifyQueue() {
  if (syncingSpotify.value) return;
  syncingSpotify.value = true;
  try {
    const { trackCount } = await musicApi.syncSpotifyQueue();
    toast.success(
      trackCount > 0
        ? `${trackCount} temas enviados a la fila de Spotify.`
        : 'No hay temas para sincronizar.',
    );
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    syncingSpotify.value = false;
  }
}

async function approve(id: string) {
  try {
    await music.approve(id);
    toast.success(
      isSpotifyProvider.value
        ? 'Aprobada · sincronizada con Spotify (reproductor abierto).'
        : music.queue.some((s) => s.id === id) || music.nowPlaying?.id === id
          ? 'Canción en cola aprobada.'
          : 'Canción aprobada.',
    );
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function reject(id: string) {
  try {
    await music.reject(id);
    toast.success('Canción rechazada.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

onMounted(async () => {
  if (auth.hasRole('OWNER')) {
    await business.fetchMine().catch(() => undefined);
  }
  if (canManageProvider.value) {
    await refreshProviderStatus().catch(() => undefined);
  }
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  await music.fetchQueue().catch((e) => toast.error(apiErrorMessage(e)));

  if (isSpotifyProvider.value) {
    await refreshSpotifyLive();
    spotifyPollTimer = setInterval(() => void refreshSpotifyLive(), 5000);
  }

  const businessId = auth.user?.businessId;
  if (businessId) {
    unregMusicSync = onMusicSyncBroadcast((msg) => {
      if (msg.businessId !== businessId) return;
      if (msg.type === 'queue-updated') {
        music.applyQueue(msg.queue);
        void refreshSpotifyLive();
        return;
      }
      music.nowPlaying = msg.track;
      void refreshSpotifyLive();
    });
  }

  unregPlaybackSync = onPlaybackSync((cmd) => {
    if (music.nowPlaying?.youtubeId === cmd.youtubeId) {
      isPlaying.value = cmd.action === 'play';
    }
  });
});

onBeforeUnmount(() => {
  if (spotifyPollTimer) clearInterval(spotifyPollTimer);
  unregPlaybackSync?.();
  unregMusicSync?.();
});
</script>
