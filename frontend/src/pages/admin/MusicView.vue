<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Música</h1>
        <p class="text-sm text-slate-400">Aprueba peticiones y gestiona la cola · el audio suena en la pantalla DJ.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a
          v-if="shareUrl"
          :href="shareUrl"
          target="_blank"
          class="btn-ghost text-sm text-neon-cyan"
        >
          ↗ Pantalla DJ
        </a>
        <a v-else href="/dj" target="_blank" class="btn-ghost text-sm text-neon-cyan">
          ↗ Pantalla DJ
        </a>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="card p-5 lg:col-span-2">
        <h2 class="font-semibold">Cola aprobada</h2>

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
              <p v-if="music.queue[0]" class="mt-0.5 truncate text-xs text-slate-400">
                Después: {{ music.queue[0].title }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 border-t border-neon-cyan/20 bg-ink-900/50 p-3">
            <button
              type="button"
              class="btn-cyan text-sm"
              @click="togglePlayback"
            >
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
            v-if="!music.nowPlaying && !music.queue.length"
            class="py-8 text-center text-sm text-slate-500"
          >
            Cola vacía · aprueba peticiones o abre la pantalla DJ para iniciar.
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
import { useMusicStore } from '@/stores/music.store';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { djShareUrl } from '@/shared/dj-share';
import { onMusicSyncBroadcast } from '@/shared/music-sync-bus';
import { onPlaybackSync } from '@/shared/playback-sync';

const music = useMusicStore();
const auth = useAuthStore();
const business = useBusinessStore();
const toast = useToast();
const playingId = ref<string | null>(null);
const isPlaying = ref(true);
const busy = ref(false);
let unregPlaybackSync: (() => void) | undefined;
let unregMusicSync: (() => void) | undefined;
let queuePollTimer: ReturnType<typeof setInterval> | undefined;

const businessSlug = computed(() => business.current?.slug ?? '');
const shareUrl = computed(() => (businessSlug.value ? djShareUrl(businessSlug.value) : ''));

function togglePlayback() {
  const businessId = auth.user?.businessId;
  const track = music.nowPlaying;
  if (!businessId || !track) return;
  const action = isPlaying.value ? 'pause' : 'play';
  music.sendPlaybackControl(businessId, { action, youtubeId: track.youtubeId });
  isPlaying.value = action === 'play';
}

watch(
  () => music.nowPlaying?.id,
  () => {
    isPlaying.value = true;
  },
);

async function skipTrack() {
  if (busy.value) return;
  busy.value = true;
  try {
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
    await music.playNext();
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
    notifyDjPlayback();
    toast.success('Reproduciendo en pantalla DJ.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    playingId.value = null;
  }
}

async function approve(id: string) {
  try {
    await music.approve(id);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function reject(id: string) {
  try {
    await music.reject(id);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

onMounted(async () => {
  if (auth.hasRole('OWNER')) {
    await business.fetchMine().catch(() => undefined);
  }
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  await music.fetchQueue().catch((e) => toast.error(apiErrorMessage(e)));

  const businessId = auth.user?.businessId;
  if (businessId) {
    unregMusicSync = onMusicSyncBroadcast((msg) => {
      if (msg.businessId !== businessId) return;
      if (msg.type === 'queue-updated') {
        music.applyQueue(msg.queue);
        return;
      }
      music.nowPlaying = msg.track;
      void music.fetchQueue().catch(() => undefined);
    });

    const refreshQueue = () => {
      void music.fetchQueue().catch(() => undefined);
    };

    queuePollTimer = setInterval(() => {
      if (document.hidden) return;
      refreshQueue();
    }, 2000);

    document.addEventListener('visibilitychange', refreshQueue);
    window.addEventListener('focus', refreshQueue);

    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', refreshQueue);
      window.removeEventListener('focus', refreshQueue);
    });
  }

  unregPlaybackSync = onPlaybackSync((cmd) => {
    if (music.nowPlaying?.youtubeId === cmd.youtubeId) {
      isPlaying.value = cmd.action === 'play';
    }
  });
});

onBeforeUnmount(() => {
  unregPlaybackSync?.();
  unregMusicSync?.();
  if (queuePollTimer) clearInterval(queuePollTimer);
});
</script>
