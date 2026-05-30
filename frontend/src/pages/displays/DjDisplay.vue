<template>
  <!-- Modo TV con reproductor: video YouTube sincronizado (recomendado) -->
  <div v-if="isTvPlayerMode" class="fixed inset-0 flex flex-col bg-black">
    <div v-if="currentTrack" class="relative flex flex-1 flex-col">
      <YoutubeDualPlayer
        ref="playerRef"
        dj-mode
        fill
        :show-progress="true"
        :sync-to-backend="false"
        :business-id="syncBusinessId"
        :current-track="currentTrack"
        :next-track="nextTrack"
        class="h-full min-h-0 flex-1"
        @playing="onPlayerPlaying"
      />
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-6 pb-6 pt-16"
      >
        <p class="truncate text-2xl font-bold text-white sm:text-3xl">{{ displayTitle }}</p>
        <p v-if="displayNext" class="mt-1 truncate text-sm text-slate-300">
          Siguiente: {{ displayNext.title }}
        </p>
      </div>
      <div class="pointer-events-none absolute left-3 top-3 z-10">
        <span class="badge bg-neon-cyan/90 text-ink-950">📺 TV</span>
      </div>
    </div>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
      <p class="text-xl font-semibold text-neon-cyan">📺 Modo TV</p>
      <p>Esperando reproducción desde la pantalla DJ…</p>
      <p class="text-xs text-slate-600">Inicia la cola en el panel de música o en la ventana DJ.</p>
    </div>
    <button
      type="button"
      class="absolute bottom-4 right-4 z-10 rounded-lg bg-black/60 px-3 py-2 text-xs text-white hover:bg-black/80"
      @click="toggleFullscreen"
    >
      ⛶ Pantalla completa
    </button>
  </div>

  <!-- Modo TV espejo WebRTC (opcional) -->
  <div v-else-if="isTvCastMode" class="fixed inset-0 flex flex-col bg-black">
    <video
      ref="castVideoRef"
      class="h-full w-full object-contain bg-black"
      autoplay
      playsinline
      muted
    />
    <div
      v-if="waiting && !receiving"
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center"
    >
      <p class="text-2xl font-bold text-neon-cyan">📺 Modo TV</p>
      <p class="max-w-md text-sm text-slate-400">
        Esperando transmisión desde la pantalla DJ…
      </p>
      <p class="text-xs text-slate-600">
        Modo espejo · prueba la URL TV normal para ver el video directamente
      </p>
    </div>
    <div
      v-if="receiving && !castHasFrame"
      class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-sm text-slate-400"
    >
      Conectado · cargando imagen…
    </div>
    <div v-if="receiving" class="pointer-events-none absolute left-3 top-3 z-10">
      <span class="badge bg-red-500/90 text-white">● EN VIVO</span>
    </div>
    <button
      type="button"
      class="absolute bottom-4 right-4 z-10 rounded-lg bg-black/60 px-3 py-2 text-xs text-white hover:bg-black/80"
      @click="toggleFullscreen"
    >
      ⛶ Pantalla completa
    </button>
  </div>

  <!-- Modo normal / ventana DJ -->
  <div v-else class="min-h-screen bg-ink-950" :class="isShared ? 'p-2 sm:p-4' : 'p-4'">
    <header
      class="mb-4 flex items-center justify-between gap-3"
      :class="isShared ? 'px-1' : ''"
    >
      <div class="min-w-0">
        <h1 class="truncate text-xl font-extrabold text-neon-pink sm:text-2xl">
          🎧 {{ isShared ? businessName : 'DJ · Bartender' }}
        </h1>
        <p v-if="isShared" class="text-xs text-slate-500">Ventana DJ · selecciona esta ventana al compartir pantalla</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="isShared && syncBusinessId && !screenShare.sharing.value"
          type="button"
          class="btn-cyan px-2 py-1 text-xs"
          @click="openTvMode"
        >
          📺 URL TV
        </button>
        <span v-if="screenShare.sharing.value" class="badge bg-red-500/20 text-red-300">● EN TV</span>
        <span v-if="!isShared" class="badge bg-emerald-500/15 text-emerald-300">● dual player</span>
        <button
          type="button"
          class="btn-ghost px-2 py-1 text-xs"
          title="Pantalla completa"
          @click="toggleFullscreen"
        >
          ⛶
        </button>
      </div>
    </header>

    <div
      v-if="!isTvMode && effectiveSlug && syncBusinessId"
      class="mb-4 rounded-lg border border-neon-cyan/30 bg-ink-900/80 p-4"
    >
      <p class="font-medium text-slate-200">📺 Ver en TV</p>
      <p class="mt-2 text-xs text-slate-400">
        Abre la URL en la TV/smart TV y el
        <strong class="text-slate-300">video se reproduce directamente</strong>
        (sincronizado con la pantalla DJ).
      </p>
      <p class="mt-2 break-all text-xs">
        <a :href="tvUrl" target="_blank" class="text-neon-cyan hover:underline">{{ tvUrl }}</a>
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <a :href="tvUrl" target="_blank" class="btn-cyan text-sm">↗ Abrir modo TV</a>
        <button type="button" class="btn-ghost text-xs" @click="copyTvLink">Copiar URL TV</button>
      </div>

      <details class="mt-4 border-t border-ink-700 pt-3">
        <summary class="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
          Espejo de pantalla (avanzado · YouTube puede verse negro)
        </summary>
        <ol v-if="isShared" class="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-500">
          <li>
            Abre en la TV:
            <a :href="tvCastUrl" target="_blank" class="text-neon-cyan hover:underline">{{ tvCastUrl }}</a>
          </li>
          <li>Pulsa «Compartir espejo» y elige esta ventana</li>
        </ol>
        <ol v-else class="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-500">
          <li>
            Abre en la TV:
            <a :href="tvCastUrl" target="_blank" class="text-neon-cyan hover:underline">{{ tvCastUrl }}</a>
          </li>
          <li>Pulsa «Compartir espejo» y elige la ventana Bartender DJ</li>
        </ol>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-ghost text-sm"
            :disabled="screenShare.sharing.value"
            @click="startScreenShare"
          >
            {{ screenShare.sharing.value ? '● Compartiendo espejo…' : '📺 Compartir espejo' }}
          </button>
          <button
            v-if="screenShare.sharing.value"
            type="button"
            class="btn-ghost text-sm text-red-400"
            @click="screenShare.stopShare()"
          >
            Detener
          </button>
        </div>
        <p v-if="screenShare.error.value" class="mt-2 text-xs text-red-400">
          {{ screenShare.error.value }}
        </p>
      </details>
    </div>

    <div v-if="currentTrack" class="mx-auto max-w-5xl">
      <YoutubeDualPlayer
        ref="playerRef"
        dj-mode
        :sync-to-backend="!isShared"
        :business-id="syncBusinessId"
        :current-track="currentTrack"
        :next-track="nextTrack"
        @need-sync="syncWithBackend"
        @playing="onPlayerPlaying"
        @error="onError"
      />
      <div class="mt-4 flex items-end justify-between gap-4">
        <div class="min-w-0">
          <p class="truncate text-xl font-bold">{{ displayTitle }}</p>
          <p v-if="displayNext" class="truncate text-sm text-slate-400">
            Siguiente: {{ displayNext.title }}
          </p>
        </div>
        <button v-if="!isShared" class="btn-cyan shrink-0" @click="skip">⏭ Saltar</button>
      </div>

      <div
        v-if="!isShared && music.queue.length"
        class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="(s, i) in music.queue"
          :key="s.id"
          class="card flex items-center gap-3 p-3"
          :class="i === 0 ? 'ring-1 ring-neon-cyan/50' : ''"
        >
          <img :src="s.thumbnail ?? ''" class="h-12 w-20 rounded object-cover" alt="" />
          <span class="truncate text-sm">{{ s.title }}</span>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-500">
      <p>{{ isShared ? 'Esperando reproducción…' : 'Sin reproducción activa' }}</p>
      <button v-if="!isShared" class="btn-primary" @click="start">▶ Iniciar cola</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import YoutubeDualPlayer from '@/components/YoutubeDualPlayer.vue';
import { useMusicStore } from '@/stores/music.store';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { useDjCastReceiver } from '@/composables/useDjCastReceiver';
import { useDjScreenShare } from '@/composables/useDjScreenShare';
import { apiErrorMessage } from '@/services/http';
import { businessApi } from '@/services/api';
import { useToast } from '@/composables/useToast';
import { copyDjShareUrl, djTvCastUrl, djTvUrl } from '@/shared/dj-share';
import { onNowPlayingBroadcast } from '@/shared/music-sync-bus';
import type { MusicRequest } from '@/shared/types';
import type { YoutubePlayerTrack } from '@/shared/youtube.types';

const route = useRoute();
const music = useMusicStore();
const auth = useAuthStore();
const business = useBusinessStore();
const toast = useToast();
const playerRef = ref<InstanceType<typeof YoutubeDualPlayer> | null>(null);
const castVideoRef = ref<HTMLVideoElement | null>(null);
const castHasFrame = ref(false);
const liveTrack = ref<YoutubePlayerTrack | null>(null);
const syncing = ref(false);
const businessName = ref('DJ');
const tvBusinessId = ref('');

const isShared = computed(() => route.meta.sharedDisplay === true);
const isTvMode = computed(() => route.query.tv === '1' || route.query.tv === 'true');
const isTvCastMode = computed(
  () => isTvMode.value && (route.query.cast === '1' || route.query.cast === 'true'),
);
const isTvPlayerMode = computed(() => isTvMode.value && !isTvCastMode.value);
const businessSlug = computed(() => route.params.businessSlug as string | undefined);
const staffSlug = ref('');
const effectiveSlug = computed(() => businessSlug.value || staffSlug.value);
const tvUrl = computed(() => (effectiveSlug.value ? djTvUrl(effectiveSlug.value) : ''));
const tvCastUrl = computed(() => (effectiveSlug.value ? djTvCastUrl(effectiveSlug.value) : ''));
const syncBusinessId = computed(
  () => tvBusinessId.value || auth.user?.businessId || null,
);

const screenShare = useDjScreenShare(() => syncBusinessId.value);

const { receiving, waiting } = useDjCastReceiver(
  tvBusinessId,
  castVideoRef,
  isTvCastMode,
);

watch(castVideoRef, (el, _, onCleanup) => {
  if (!el) return;
  const onFrame = () => {
    castHasFrame.value = el.videoWidth > 0 && el.videoHeight > 0;
  };
  el.addEventListener('loadeddata', onFrame);
  el.addEventListener('resize', onFrame);
  onCleanup(() => {
    el.removeEventListener('loadeddata', onFrame);
    el.removeEventListener('resize', onFrame);
  });
});

watch(receiving, (live) => {
  if (!live) castHasFrame.value = false;
});

function toTrack(req: MusicRequest | null): YoutubePlayerTrack | null {
  if (!req) return null;
  return { id: req.id, youtubeId: req.youtubeId, title: req.title };
}

const currentTrack = computed(() => toTrack(music.nowPlaying));
const nextTrack = computed(() => toTrack(music.queue[0] ?? null));
const displayTitle = computed(
  () => liveTrack.value?.title ?? music.nowPlaying?.title ?? '',
);
const displayNext = computed(() => {
  const liveId = liveTrack.value?.id;
  const candidate = music.queue.find((s) => s.id !== liveId) ?? null;
  return toTrack(candidate);
});

function onPlayerPlaying(track: YoutubePlayerTrack) {
  liveTrack.value = track;
}

watch(
  () => music.nowPlaying,
  (req) => {
    if (req) liveTrack.value = toTrack(req);
  },
);

async function applyTrackToPlayer() {
  if (isTvCastMode.value) return;
  const track = toTrack(music.nowPlaying);
  if (!track) return;
  await nextTick();
  playerRef.value?.switchToTrack(track);
  liveTrack.value = track;
}

watch(
  () => music.nowPlaying?.id,
  (id, prev) => {
    if (!id || id === prev || isTvCastMode.value) return;
    void applyTrackToPlayer();
  },
);

let unregMusicBroadcast: (() => void) | undefined;
let queuePollTimer: ReturnType<typeof setInterval> | undefined;

async function syncWithBackend() {
  if (isShared.value || isTvMode.value) return;
  if (syncing.value) return;
  syncing.value = true;
  try {
    await music.playNext();
    liveTrack.value = toTrack(music.nowPlaying);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    syncing.value = false;
  }
}

function onError() {
  if (!isShared.value && !isTvMode.value) void syncWithBackend();
}

async function skip() {
  playerRef.value?.forceSkip();
  try {
    await music.skip();
    liveTrack.value = toTrack(music.nowPlaying);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function start() {
  await music.playNext().catch((e) => toast.error(apiErrorMessage(e)));
}

async function copyTvLink() {
  if (!effectiveSlug.value) return;
  const ok = await copyDjShareUrl(effectiveSlug.value, true);
  toast[ok ? 'success' : 'error'](ok ? 'URL de TV copiada.' : 'No se pudo copiar.');
}

function openTvMode() {
  if (!tvUrl.value) return;
  window.open(tvUrl.value, '_blank');
}

async function startScreenShare() {
  if (!effectiveSlug.value) return;
  const ok = await screenShare.startShare(effectiveSlug.value, { openPopup: !isShared.value });
  if (ok) {
    toast.success(
      isShared.value
        ? 'Selecciona esta ventana DJ en el diálogo del navegador.'
        : 'Selecciona la ventana Bartender DJ en el diálogo del navegador.',
    );
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  const el = isTvMode.value ? document.documentElement : document.documentElement;
  void el.requestFullscreen?.();
}

async function initSharedDisplay(slug: string) {
  const biz = await businessApi.publicBySlug(slug);
  businessName.value = biz.name;
  tvBusinessId.value = biz.id;
  music.bindBusiness(biz.id);
  await music.fetchPublicQueue(slug);
  liveTrack.value = toTrack(music.nowPlaying);
}

async function initStaffDisplay() {
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  await business.fetchMine().catch(() => undefined);
  staffSlug.value = business.current?.slug ?? '';
  await music.fetchQueue().catch((e) => toast.error(apiErrorMessage(e)));
  if (!music.nowPlaying && music.queue.length) await start();
  liveTrack.value = toTrack(music.nowPlaying);
}

onMounted(async () => {
  try {
    if ((isShared.value || isTvMode.value) && businessSlug.value) {
      await initSharedDisplay(businessSlug.value);
    } else {
      await initStaffDisplay();
    }

    if (isTvPlayerMode.value) {
      await applyTrackToPlayer();
    }

    unregMusicBroadcast = onNowPlayingBroadcast((msg) => {
      const bizId = syncBusinessId.value;
      if (!bizId || msg.businessId !== bizId) return;
      music.nowPlaying = msg.track;
      void applyTrackToPlayer();
    });

    queuePollTimer = setInterval(() => {
      if (isTvCastMode.value) return;
      if ((isShared.value || isTvPlayerMode.value) && businessSlug.value) {
        void music.fetchPublicQueue(businessSlug.value);
      } else if (auth.user?.businessId) {
        void music.fetchQueue();
      }
    }, 5000);

    if (isTvPlayerMode.value || isTvCastMode.value) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
});

onBeforeUnmount(() => {
  unregMusicBroadcast?.();
  if (queuePollTimer) clearInterval(queuePollTimer);
});
</script>
