<template>
  <!-- Modo TV con reproductor: video YouTube sincronizado (recomendado) -->
  <div v-if="isTvPlayerMode" class="fixed inset-0 flex flex-col bg-black">
    <div v-if="currentTrack" class="relative flex flex-1 flex-col">
      <YoutubeDualPlayer
        ref="playerRef"
        dj-mode
        fill
        :show-progress="true"
        :sync-to-backend="playerSyncBackend"
        :business-id="syncBusinessId"
        :current-track="currentTrack"
        :next-track="nextTrack"
        class="h-full min-h-0 flex-1"
        @need-sync="onPlayerNeedSync"
        @ended="onTrackEnded"
        @queue-empty="onQueueEmpty"
        @playing="onPlayerPlaying"
        @error="onPlayerError"
        @external-fallback="onPlaybackUnavailable"
        @playback-unavailable="onPlaybackUnavailable"
        @resolved-alternative="onResolvedAlternative"
      />
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 pb-6 pt-20"
      >
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">En reproducción</p>
        <p class="truncate text-2xl font-bold text-white sm:text-3xl">{{ displayTitle }}</p>
        <div
          v-if="nextQueueItem"
          class="mt-4 flex items-center gap-3 border-t border-white/10 pt-4"
        >
          <span class="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-neon-cyan">
            Siguiente
          </span>
          <img
            v-if="nextQueueItem.thumbnail"
            :src="nextQueueItem.thumbnail"
            class="h-11 w-[4.5rem] shrink-0 rounded object-cover"
            alt=""
          />
          <div class="min-w-0">
            <p class="truncate text-base font-semibold text-white sm:text-lg">{{ nextQueueItem.title }}</p>
            <p v-if="nextQueueItem.channelTitle" class="truncate text-xs text-slate-400">
              {{ nextQueueItem.channelTitle }}
            </p>
          </div>
        </div>
        <p v-else class="mt-3 text-sm text-slate-500">No hay más canciones en cola</p>
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
      class="absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 px-3 py-2 text-xs text-white hover:bg-black/80"
      @click="exitTvMode"
    >
      ← Pantalla DJ
    </button>
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
      class="absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 px-3 py-2 text-xs text-white hover:bg-black/80"
      @click="exitTvMode"
    >
      ← Pantalla DJ
    </button>
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
    <!--<header
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
          type="button"
          class="btn-cyan px-2 py-1 text-xs"
          @click="enterTvMode"
        >
          📺 Modo TV
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
    </header>-->

    <!--<div
      v-if="effectiveSlug && syncBusinessId"
      class="mb-4 rounded-lg border border-neon-cyan/30 bg-ink-900/80 p-4"
    >
      <p class="font-medium text-slate-200">📺 Ver en otra pantalla (TV, proyector…)</p>
      <p class="mt-2 text-xs text-slate-400">
        Usa <strong class="text-slate-300">Modo TV</strong> arriba en esta ventana, o abre esta URL en el
        dispositivo externo (video sincronizado con la DJ).
      </p>
      <p class="mt-2 break-all text-xs">
        <a :href="tvUrl" target="_blank" class="text-neon-cyan hover:underline">{{ tvUrl }}</a>
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="btn-cyan text-sm" @click="enterTvMode">📺 Activar modo TV aquí</button>
        <a v-if="tvUrl" :href="tvUrl" target="_blank" class="btn-ghost text-sm">↗ Abrir en otra pestaña</a>
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
    </div>-->

    <div v-if="currentTrack" class="mx-auto max-w-10xl">
      <YoutubeDualPlayer
        ref="playerRef"
        dj-mode
        :sync-to-backend="playerSyncBackend"
        :business-id="syncBusinessId"
        :current-track="currentTrack"
        :next-track="nextTrack"
        @need-sync="onPlayerNeedSync"
        @ended="onTrackEnded"
        @queue-empty="onQueueEmpty"
        @playing="onPlayerPlaying"
        @error="onPlayerError"
        @external-fallback="onPlaybackUnavailable"
        @playback-unavailable="onPlaybackUnavailable"
        @resolved-alternative="onResolvedAlternative"
      />
      <div class="mt-4 flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1 space-y-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">En reproducción</p>
            <p class="truncate text-xl font-bold">{{ displayTitle }}</p>
          </div>
          <div
            v-if="nextQueueItem"
            class="rounded-lg border border-ink-700 bg-ink-900/60 p-3"
          >
            <p class="text-[11px] font-semibold uppercase tracking-wider text-neon-cyan">Siguiente en cola</p>
            <div class="mt-2 flex items-center gap-3">
              <img
                v-if="nextQueueItem.thumbnail"
                :src="nextQueueItem.thumbnail"
                class="h-12 w-20 shrink-0 rounded object-cover"
                alt=""
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-100">{{ nextQueueItem.title }}</p>
                <p v-if="nextQueueItem.channelTitle" class="truncate text-xs text-slate-400">
                  {{ nextQueueItem.channelTitle }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-slate-500">No hay más canciones en cola</p>
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
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import { onMusicSyncBroadcast } from '@/shared/music-sync-bus';
import { onMusicPlaybackChanged } from '@/shared/music-playback-bus';
import type { MusicRequest } from '@/shared/types';
import type { YoutubePlayerTrack } from '@/shared/youtube.types';

const route = useRoute();
const router = useRouter();
const music = useMusicStore();
const auth = useAuthStore();
const business = useBusinessStore();
const toast = useToast();
const playerRef = ref<InstanceType<typeof YoutubeDualPlayer> | null>(null);
const castVideoRef = ref<HTMLVideoElement | null>(null);
const castHasFrame = ref(false);
const liveTrack = ref<YoutubePlayerTrack | null>(null);
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

/** Pantallas DJ/TV pueden sincronizar vía API staff o pública por slug. */
const playerSyncBackend = computed(() => {
  if (isTvCastMode.value) return false;
  if (effectiveSlug.value) return true;
  return !!auth.user?.businessId;
});

const useStaffPlaybackApi = computed(
  () => !!auth.user?.businessId && syncBusinessId.value === auth.user.businessId,
);

function enterTvMode() {
  router.push({ path: route.path, query: { ...route.query, tv: '1' } });
}

function exitTvMode() {
  const q = { ...route.query } as Record<string, string | string[]>;
  delete q.tv;
  delete q.cast;
  router.push({ path: route.path, query: q });
}

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
  return { id: req.id, youtubeId: req.youtubeId, title: req.title, channelTitle: req.channelTitle };
}

/** Siguiente pista en cola tras `afterId` (nowPlaying no está en queue). */
function queueItemAfter(afterId: string | null | undefined): MusicRequest | null {
  const q = music.queue;
  if (!q.length) return null;
  if (!afterId) return q[0];
  const idx = q.findIndex((s) => s.id === afterId);
  if (idx >= 0) return q[idx + 1] ?? null;
  return q[0].id !== afterId ? q[0] : q[1] ?? null;
}

/** Fuente de verdad: cola del backend (nowPlaying). */
const currentTrack = computed(() => toTrack(music.nowPlaying) ?? liveTrack.value);

const nextQueueItem = computed((): MusicRequest | null => {
  return queueItemAfter(music.nowPlaying?.id ?? null);
});

const nextTrack = computed(() => toTrack(nextQueueItem.value));

const displayTitle = computed(
  () => currentTrack.value?.title ?? music.nowPlaying?.title ?? '',
);

let skipInProgress = false;
let unregMusicBroadcast: (() => void) | undefined;
let unregPlaybackChanged: (() => void) | undefined;

/** Aplica nowPlaying al reproductor solo si hace falta (no reinicia al enfocar la pestaña). */
function syncPlayerFromStore(options: { force?: boolean } = {}) {
  if (isTvCastMode.value || skipInProgress) return;
  const req = music.nowPlaying;
  const track = toTrack(req);
  if (!track?.youtubeId) return;
  liveTrack.value = track;
  void applyTrackToPlayer(req ?? undefined, options);
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible' || isTvCastMode.value) return;
  playerRef.value?.refreshLayout();
}

function onPlayerPlaying(track: YoutubePlayerTrack) {
  if (skipInProgress) return;
  liveTrack.value = track;
  const needsSync =
    track.id !== music.nowPlaying?.id || music.nowPlaying?.status !== 'playing';
  if (playerSyncBackend.value && needsSync) {
    scheduleBackendSync();
  }
}

watch(
  () => music.nowPlaying?.id,
  async (id, prev) => {
    if (!id || id === prev || isTvCastMode.value || skipInProgress) return;
    syncPlayerFromStore();
  },
);

watch(
  () => route.query.tv,
  async (tv) => {
    if (tv !== '1' && tv !== 'true') return;
    if (isTvCastMode.value) return;
    await nextTick();
    await applyTrackToPlayer();
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  },
);

async function applyTrackToPlayer(
  source?: MusicRequest | null,
  options: { force?: boolean } = {},
) {
  if (isTvCastMode.value) return;
  const req = source ?? music.nowPlaying;
  const track = toTrack(req);
  if (!track?.youtubeId) return;

  await nextTick();
  const deadline = Date.now() + 15_000;
  while (!playerRef.value && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (!playerRef.value) return;

  const ready = await playerRef.value.whenReady();
  if (!ready) return;

  const force = options.force === true;
  if (!force && playerRef.value.isPlayingTrack(track)) return;

  await playerRef.value.applyTrack(track, { force });
}

async function refreshQueueAndApply() {
  try {
    if (useStaffPlaybackApi.value) {
      await music.fetchQueue();
    } else if (effectiveSlug.value) {
      await music.fetchPublicQueue(effectiveSlug.value);
    } else if (auth.user?.businessId) {
      await music.fetchQueue();
    }
    await applyTrackToPlayer();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function onPlayerNeedSync() {
  if (playerSyncBackend.value) {
    scheduleBackendSync();
    return;
  }
  await refreshQueueAndApply();
}

/** Avanza la cola en el backend y carga la siguiente pista en el reproductor. */
async function advanceQueueFromBackend() {
  if (useStaffPlaybackApi.value) {
    await music.playNext();
  } else if (effectiveSlug.value) {
    await music.playNextPublic(effectiveSlug.value);
  } else {
    return;
  }
  liveTrack.value = toTrack(music.nowPlaying);
  await applyTrackToPlayer();
}

async function onTrackEnded(finished: YoutubePlayerTrack) {
  const advancedLocally =
    liveTrack.value != null &&
    liveTrack.value.id !== finished.id &&
    music.queue.some((q) => q.id === liveTrack.value!.id);

  if (advancedLocally) {
    if (playerSyncBackend.value) scheduleBackendSync();
    return;
  }

  try {
    await advanceQueueFromBackend();
  } catch {
    await refreshQueueAndApply();
  }
}

/** Si el reproductor se quedó sin “siguiente” local, intenta sacar otra de la cola en BD. */
async function onQueueEmpty() {
  if (music.queue.length) {
    try {
      await advanceQueueFromBackend();
    } catch {
      await refreshQueueAndApply();
    }
    return;
  }
  try {
    await advanceQueueFromBackend();
  } catch {
    /* cola realmente vacía */
  }
}

async function onResolvedAlternative(payload: {
  track: YoutubePlayerTrack;
  youtubeId: string;
  title: string;
}) {
  try {
    await music.updatePlaybackSource(
      payload.track.id,
      { youtubeId: payload.youtubeId, title: payload.title },
      { businessSlug: effectiveSlug.value, useStaffApi: useStaffPlaybackApi.value },
    );
    liveTrack.value = {
      ...payload.track,
      youtubeId: payload.youtubeId,
      title: payload.title,
    };
    toast.info('Reproduciendo versión alternativa disponible.');
  } catch {
    /* La alternativa sigue sonando localmente aunque falle el guardado. */
  }
}

async function onPlaybackUnavailable() {
  try {
    if (useStaffPlaybackApi.value) {
      await music.skip();
    } else if (effectiveSlug.value) {
      await music.skipPublic(effectiveSlug.value);
    } else {
      await refreshQueueAndApply();
      return;
    }
    liveTrack.value = toTrack(music.nowPlaying);
    await applyTrackToPlayer();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function onPlayerError() {
  await onPlaybackUnavailable();
}

let backendSyncChain: Promise<void> = Promise.resolve();

/** Encola sincronización con el backend (evita saltos dobles y sync perdidos). */
function scheduleBackendSync() {
  if (!playerSyncBackend.value) return;
  backendSyncChain = backendSyncChain.then(() => syncWithBackendInternal()).catch((e) => {
    toast.error(apiErrorMessage(e));
  });
}

async function syncWithBackendInternal() {
  const live = liveTrack.value;
  if (!live) return;

  await music.syncLiveTrack(live.id, {
    businessSlug: effectiveSlug.value,
    useStaffApi: useStaffPlaybackApi.value,
  });
  liveTrack.value = toTrack(music.nowPlaying);
}

async function skip() {
  if (skipInProgress) return;
  skipInProgress = true;
  try {
    if (useStaffPlaybackApi.value) {
      await music.skip();
    } else if (effectiveSlug.value) {
      await music.skipPublic(effectiveSlug.value);
    } else {
      await playerRef.value?.forceSkip();
      liveTrack.value = toTrack(music.nowPlaying);
      return;
    }

    const playing = music.nowPlaying;
    liveTrack.value = toTrack(playing);
    if (!playing?.youtubeId) return;

    await nextTick();
    await applyTrackToPlayer(playing, { force: true });
  } catch (e) {
    toast.error(apiErrorMessage(e));
    await refreshQueueAndApply().catch(() => undefined);
  } finally {
    skipInProgress = false;
  }
}

async function start() {
  try {
    await music.playNext();
    liveTrack.value = toTrack(music.nowPlaying);
    await applyTrackToPlayer(music.nowPlaying);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function copyTvLink() {
  if (!effectiveSlug.value) return;
  const ok = await copyDjShareUrl(effectiveSlug.value, true);
  toast[ok ? 'success' : 'error'](ok ? 'URL de TV copiada.' : 'No se pudo copiar.');
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
  if (useStaffPlaybackApi.value) {
    await music.fetchQueue();
  } else {
    await music.fetchPublicQueue(slug);
  }
  if (!music.nowPlaying && music.queue.length) {
    try {
      if (useStaffPlaybackApi.value) {
        await music.playNext();
      } else {
        await music.playNextPublic(slug);
      }
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }
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

onBeforeMount(() => {
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  unregPlaybackChanged = onMusicPlaybackChanged(syncPlayerFromStore);
  unregMusicBroadcast = onMusicSyncBroadcast((msg) => {
    const bizId = syncBusinessId.value;
    if (!bizId || msg.businessId !== bizId) return;
    if (msg.type === 'queue-updated') {
      music.applyQueue(msg.queue);
      return;
    }
    music.nowPlaying = msg.track;
    syncPlayerFromStore();
  });
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onMounted(async () => {
  try {
    if ((isShared.value || isTvMode.value) && businessSlug.value) {
      await initSharedDisplay(businessSlug.value);
    } else {
      await initStaffDisplay();
    }

    await nextTick();
    if (!isTvCastMode.value) {
      syncPlayerFromStore();
    }

    if (isTvPlayerMode.value || isTvCastMode.value) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
});

onBeforeUnmount(() => {
  unregPlaybackChanged?.();
  unregMusicBroadcast?.();
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>
