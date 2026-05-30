<template>
  <div
    class="relative w-full overflow-hidden bg-black"
    :class="fill ? 'h-full rounded-none' : 'aspect-video rounded-xl'"
  >
    <div
      :id="elementIds.a"
      class="absolute inset-0 h-full w-full"
      :class="activeSlot === 'a' ? 'z-20' : 'z-10 pointer-events-none'"
      :aria-hidden="activeSlot !== 'a'"
    />
    <div
      :id="elementIds.b"
      class="absolute inset-0 h-full w-full"
      :class="activeSlot === 'b' ? 'z-20' : 'z-10 pointer-events-none'"
      :aria-hidden="activeSlot !== 'b'"
    />

    <div
      v-if="showProgress"
      class="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6"
    >
      <div class="h-1 overflow-hidden rounded-full bg-white/20">
        <div
          class="h-full rounded-full bg-neon-cyan transition-[width] duration-300 ease-linear"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
      <div class="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
        <span>{{ formatTime(elapsedSec) }}</span>
        <span class="text-slate-400">{{ statusLabel }}</span>
        <span v-if="remainingSec > 0">-{{ formatTime(remainingSec) }}</span>
      </div>
    </div>

    <div
      v-else-if="statusLabel"
      class="pointer-events-none absolute bottom-2 left-2 z-30 rounded-lg bg-black/60 px-2 py-1 text-xs text-slate-300"
    >
      {{ statusLabel }}
    </div>

    <div
      v-if="fallbackLoading"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4 text-center"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
      <p class="text-sm text-slate-300">Buscando una versión disponible…</p>
    </div>

    <div
      v-if="autoplayBlocked"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center"
    >
      <p class="text-sm text-slate-300">Autoplay bloqueado por el navegador</p>
      <button type="button" class="btn-primary text-sm" @click="resumePlayback">▶ Reproducir</button>
    </div>

    <div
      v-if="queueEmptySoon"
      class="pointer-events-none absolute right-2 top-2 z-30 rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-200"
    >
      Última canción
    </div>

    <div
      v-if="businessId && syncPlayback"
      class="absolute right-2 top-2 z-30 flex gap-1"
    >
      <button
        type="button"
        class="rounded-lg bg-black/70 px-2.5 py-1.5 text-sm text-white hover:bg-black/90"
        :title="isPlaying ? 'Pausar (todas las pantallas)' : 'Reproducir (todas las pantallas)'"
        @click="togglePlayPause"
      >
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { loadYoutubeIframeApi } from '@/composables/useYoutubeIframeApi';
import { useToast } from '@/composables/useToast';
import { useMusicStore } from '@/stores/music.store';
import {
  getCachedTrackResolution,
  handleBlockedVideo,
  isEmbedBlockedError,
  markBlocked,
  prefetchTrackForPlayback,
  resolveTrackForPlayback,
} from '@/services/youtubeFallbackService';
import { onPlaybackSync, type PlaybackSyncCommand } from '@/shared/playback-sync';
import {
  YT_PLAYER_STATE,
  type YoutubePlayerInstance,
  type YoutubePlayerTrack,
} from '@/shared/youtube.types';

/** A 5 s del final → swap al player alterno. */
const SWAP_SECONDS = 5;
const PREBUFFER_SECONDS = SWAP_SECONDS + 3;
const MIN_DURATION_FOR_EARLY_SWAP = SWAP_SECONDS + 3;
const TICK_MS = 150;
const PLAY_WAIT_MS = 5000;

const props = withDefaults(
  defineProps<{
    currentTrack: YoutubePlayerTrack | null;
    nextTrack: YoutubePlayerTrack | null;
    djMode?: boolean;
    showProgress?: boolean;
    /** Si false, no emite need-sync (pantalla compartida esclava). */
    syncToBackend?: boolean;
    /** ID del negocio para sincronizar play/pause entre reproductores. */
    businessId?: string | null;
    /** Sincronizar play/pause vía WebSocket (todas las vistas). */
    syncPlayback?: boolean;
    /** Ocupa todo el alto del contenedor (modo TV). */
    fill?: boolean;
  }>(),
  { djMode: false, showProgress: true, syncToBackend: true, businessId: null, syncPlayback: true, fill: false },
);

const music = useMusicStore();
const toast = useToast();

const emit = defineEmits<{
  ended: [track: YoutubePlayerTrack];
  error: [track: YoutubePlayerTrack, code: number];
  'external-fallback': [track: YoutubePlayerTrack];
  'need-sync': [];
  playing: [track: YoutubePlayerTrack];
  'queue-empty': [];
}>();

type Slot = 'a' | 'b';

const instanceId = `yt-${Math.random().toString(36).slice(2, 9)}`;
const elementIds = reactive({ a: `${instanceId}-a`, b: `${instanceId}-b` });

const activeSlot = ref<Slot>('a');
const playerA = ref<YoutubePlayerInstance | null>(null);
const playerB = ref<YoutubePlayerInstance | null>(null);
const ready = ref({ a: false, b: false });
const loadedIds = ref<Record<Slot, string>>({ a: '', b: '' });
const preloadedReady = ref<Record<Slot, string>>({ a: '', b: '' });
const playerState = ref<number | null>(null);
const autoplayBlocked = ref(false);
const swapping = ref(false);
const swappedTrackId = ref<string | null>(null);
const pauseAfterLoadSlot = ref<Slot | null>(null);
const elapsedSec = ref(0);
const remainingSec = ref(0);
const progressPct = ref(0);
const suppressPlaybackBroadcast = ref(false);
const prevActivePlayerState = ref<number | null>(null);
const fallbackLoading = ref(false);
const resolvingBlocked = ref(false);
const prefetchingNextId = ref<string | null>(null);
/** ID de la pista que ya suena en el player activo (evita recargas al cambiar props). */
const activeTrackId = ref<string | null>(null);

let tickTimer: ReturnType<typeof setInterval> | null = null;
let unregPlaybackSync: (() => void) | null = null;
let destroyed = false;

const isPlaying = computed(
  () =>
    playerState.value === YT_PLAYER_STATE.PLAYING ||
    playerState.value === YT_PLAYER_STATE.BUFFERING,
);

const queueEmptySoon = computed(
  () => props.currentTrack && !props.nextTrack && playerState.value === YT_PLAYER_STATE.PLAYING,
);

const statusLabel = computed(() => {
  if (swapping.value) return 'Transición DJ…';
  if (props.nextTrack) {
    const resolved = getCachedTrackResolution(props.nextTrack.id);
    const nextYoutubeId = resolved?.ok ? resolved.youtubeId : props.nextTrack.youtubeId;
    if (preloadedReady.value[inactiveSlot()] === nextYoutubeId) {
      return '⏭ Siguiente listo';
    }
    if (prefetchingNextId.value === props.nextTrack.id) {
      return '⏭ Preparando siguiente…';
    }
  }
  if (playerState.value === YT_PLAYER_STATE.BUFFERING) return 'Buffering…';
  if (playerState.value === YT_PLAYER_STATE.PLAYING) {
    return activeSlot.value === 'a' ? '▶ Player A' : '▶ Player B';
  }
  if (playerState.value === YT_PLAYER_STATE.PAUSED) return 'Pausado';
  return '';
});

function toPlaybackSource(track: YoutubePlayerTrack) {
  return {
    trackId: track.id,
    youtubeId: track.youtubeId,
    title: track.title,
    channelTitle: track.channelTitle,
  };
}

function resolvedYoutubeId(track: YoutubePlayerTrack): string {
  const cached = getCachedTrackResolution(track.id);
  return cached?.ok ? cached.youtubeId : track.youtubeId;
}

function isSlotReadyForVideo(slot: Slot, youtubeId: string): boolean {
  if (getVideoId(slot) !== youtubeId) return false;
  if (preloadedReady.value[slot] === youtubeId) return true;
  try {
    const state = slotPlayer(slot)?.getPlayerState();
    return (
      state === YT_PLAYER_STATE.PAUSED ||
      state === YT_PLAYER_STATE.CUED ||
      state === YT_PLAYER_STATE.PLAYING ||
      state === YT_PLAYER_STATE.BUFFERING
    );
  } catch {
    return false;
  }
}

function trackFromResolved(track: YoutubePlayerTrack, youtubeId: string, title: string): YoutubePlayerTrack {
  return { ...track, youtubeId, title };
}

function formatTime(sec: number): string {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function slotPlayer(slot: Slot): YoutubePlayerInstance | null {
  return slot === 'a' ? playerA.value : playerB.value;
}

function inactiveSlot(): Slot {
  return activeSlot.value === 'a' ? 'b' : 'a';
}

function getVideoId(slot: Slot): string {
  try {
    return slotPlayer(slot)?.getVideoData()?.video_id ?? '';
  } catch {
    return '';
  }
}

function isTrackActiveOnPlayer(track: YoutubePlayerTrack): boolean {
  if (activeTrackId.value !== track.id) return false;
  try {
    const state = slotPlayer(activeSlot.value)?.getPlayerState();
    return (
      state === YT_PLAYER_STATE.PLAYING ||
      state === YT_PLAYER_STATE.BUFFERING ||
      state === YT_PLAYER_STATE.PAUSED ||
      state === YT_PLAYER_STATE.CUED
    );
  } catch {
    return false;
  }
}

function isPlayingTrack(trackId: string): boolean {
  return activeTrackId.value === trackId;
}


function refreshVisiblePlayer(slot: Slot) {
  const player = slotPlayer(slot);
  if (!player) return;
  try {
    const container = document.getElementById(elementIds[slot]);
    const w = container?.clientWidth ?? 640;
    const h = container?.clientHeight ?? 360;
    player.setSize?.(w, h);
    const iframe = player.getIframe?.();
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.border = 'none';
    }
  } catch {
    /* ignore */
  }
}

function syncPlayerStateFromSlot(slot: Slot) {
  try {
    playerState.value = slotPlayer(slot)?.getPlayerState() ?? null;
  } catch {
    /* ignore */
  }
}

function updateProgress() {
  const player = slotPlayer(activeSlot.value);
  if (!player) return;
  try {
    const duration = player.getDuration();
    const current = player.getCurrentTime();
    if (!duration || duration <= 0) return;
    elapsedSec.value = current;
    remainingSec.value = Math.max(0, duration - current);
    progressPct.value = Math.min(100, (current / duration) * 100);
  } catch {
    /* ignore */
  }
}

function getCurrentTimeSafe(slot: Slot): number | undefined {
  try {
    const t = slotPlayer(slot)?.getCurrentTime();
    return t && t > 0 ? t : undefined;
  } catch {
    return undefined;
  }
}

function broadcastPlaybackState(action: 'play' | 'pause') {
  if (!props.businessId || !props.syncPlayback || suppressPlaybackBroadcast.value || swapping.value) {
    return;
  }
  const youtubeId = getVideoId(activeSlot.value) || props.currentTrack?.youtubeId;
  if (!youtubeId) return;
  music.sendPlaybackControl(props.businessId, {
    action,
    youtubeId,
    at: getCurrentTimeSafe(activeSlot.value),
  });
}

function applyRemotePlayback(cmd: PlaybackSyncCommand) {
  if (!bothReady() || !props.syncPlayback) return;

  suppressPlaybackBroadcast.value = true;
  try {
    const slot = activeSlot.value;
    const player = slotPlayer(slot);
    if (!player) return;

    const onSlot = getVideoId(slot);
    if (onSlot !== cmd.youtubeId) {
      if (props.currentTrack?.youtubeId === cmd.youtubeId) {
        playSlot(slot, props.currentTrack);
      } else {
        player.loadVideoById(cmd.youtubeId, cmd.at ?? 0);
        loadedIds.value[slot] = cmd.youtubeId;
      }
    }

    if (cmd.action === 'pause') {
      player.pauseVideo();
      playerState.value = YT_PLAYER_STATE.PAUSED;
      prevActivePlayerState.value = YT_PLAYER_STATE.PAUSED;
    } else {
      if (cmd.at != null && cmd.at > 0) player.seekTo?.(cmd.at, true);
      player.unMute();
      player.setVolume?.(100);
      player.playVideo();
      playerState.value = YT_PLAYER_STATE.PLAYING;
      prevActivePlayerState.value = YT_PLAYER_STATE.PLAYING;
    }
  } catch {
    /* ignore */
  } finally {
    setTimeout(() => {
      suppressPlaybackBroadcast.value = false;
    }, 500);
  }
}

function togglePlayPause() {
  const player = slotPlayer(activeSlot.value);
  if (!player) return;
  try {
    const state = player.getPlayerState();
    if (state === YT_PLAYER_STATE.PLAYING || state === YT_PLAYER_STATE.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  } catch {
    /* ignore */
  }
}

function baseVars() {
  return {
    autoplay: 1,
    controls: props.djMode ? 0 : 1,
    rel: 0,
    modestbranding: 1,
    playsinline: 1,
    fs: props.djMode ? 0 : 1,
    disablekb: props.djMode ? 1 : 0,
    iv_load_policy: 3,
    origin: window.location.origin,
  };
}

function waitForPlayerState(slot: Slot, states: number[], timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (destroyed) {
        resolve(false);
        return;
      }
      try {
        const s = slotPlayer(slot)?.getPlayerState();
        if (s !== undefined && states.includes(s)) {
          resolve(true);
          return;
        }
      } catch {
        /* ignore */
      }
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(poll, 80);
    };
    poll();
  });
}

async function initPlayers() {
  await loadYoutubeIframeApi();
  if (destroyed || !window.YT?.Player) return;

  const makeHandlers = (slot: Slot) => ({
    onReady: () => {
      ready.value[slot] = true;
      maybeStart();
    },
    onStateChange: (event: { data: number }) => {
      // Pausar precarga en player inactivo en cuanto empiece a cargar
      if (
        slot !== activeSlot.value &&
        slot === pauseAfterLoadSlot.value &&
        (event.data === YT_PLAYER_STATE.PLAYING || event.data === YT_PLAYER_STATE.BUFFERING)
      ) {
        try {
          const p = slotPlayer(slot);
          p?.pauseVideo();
          p?.mute();
          preloadedReady.value[slot] = loadedIds.value[slot];
          pauseAfterLoadSlot.value = null;
        } catch {
          /* ignore */
        }
      }

      if (slot !== activeSlot.value) return;

      const prev = prevActivePlayerState.value;
      playerState.value = event.data;

      if (
        !swapping.value &&
        !suppressPlaybackBroadcast.value &&
        props.businessId &&
        props.syncPlayback
      ) {
        if (event.data === YT_PLAYER_STATE.PAUSED && prev === YT_PLAYER_STATE.PLAYING) {
          broadcastPlaybackState('pause');
        }
        if (event.data === YT_PLAYER_STATE.PLAYING && prev === YT_PLAYER_STATE.PAUSED) {
          broadcastPlaybackState('play');
        }
      }
      prevActivePlayerState.value = event.data;

      if (event.data === YT_PLAYER_STATE.ENDED && !swapping.value) {
        void handleEndedFallback();
      }
      if (event.data === YT_PLAYER_STATE.PLAYING) {
        autoplayBlocked.value = false;
        refreshVisiblePlayer(slot);
        updateProgress();
      }
      if (event.data === YT_PLAYER_STATE.UNSTARTED) {
        autoplayBlocked.value = true;
      }
    },
    onError: (event: { data: number }) => {
      if (slot !== activeSlot.value || !props.currentTrack || resolvingBlocked.value) return;
      const code = event.data ?? -1;
      if (isEmbedBlockedError(code)) {
        void handleEmbedBlocked(props.currentTrack, code);
        return;
      }
      emit('error', props.currentTrack, code);
      void skipToNext(true);
    },
  });

  playerA.value = new window.YT.Player(elementIds.a, {
    width: '100%',
    height: '100%',
    playerVars: baseVars(),
    events: makeHandlers('a'),
  });

  playerB.value = new window.YT.Player(elementIds.b, {
    width: '100%',
    height: '100%',
    playerVars: baseVars(),
    events: makeHandlers('b'),
  });
}

function bothReady() {
  return ready.value.a && ready.value.b;
}

function maybeStart() {
  if (!bothReady() || !props.currentTrack) return;
  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;
  activateTrack(props.currentTrack);
  void prefetchNextTrack(props.nextTrack);
  startTick();
}

/** Carga real del video (no cue) en un slot. */
function loadIntoSlot(slot: Slot, youtubeId: string) {
  const player = slotPlayer(slot);
  if (!player || loadedIds.value[slot] === youtubeId) return;
  try {
    player.loadVideoById(youtubeId, 0);
    loadedIds.value[slot] = youtubeId;
    preloadedReady.value[slot] = '';
  } catch {
    /* ignore */
  }
}

/** Resuelve en background + precarga iframe del siguiente tema. */
async function prefetchNextTrack(track: YoutubePlayerTrack | null) {
  if (!track || !bothReady() || swapping.value || resolvingBlocked.value) return;
  if (prefetchingNextId.value === track.id) return;

  prefetchingNextId.value = track.id;
  try {
    const result = await prefetchTrackForPlayback(toPlaybackSource(track));
    if (!result.ok) return;

    const youtubeId = result.youtubeId;
    const slot = inactiveSlot();
    if (isSlotReadyForVideo(slot, youtubeId)) return;
    if (loadedIds.value[slot] === youtubeId && pauseAfterLoadSlot.value === slot) return;

    try {
      slotPlayer(slot)?.mute();
      loadIntoSlot(slot, youtubeId);
      pauseAfterLoadSlot.value = slot;
    } catch {
      /* ignore */
    }
  } finally {
    if (prefetchingNextId.value === track.id) prefetchingNextId.value = null;
  }
}

/** A ~8 s del final: reintentar precarga si aún no está lista. */
function prebufferNext(track: YoutubePlayerTrack) {
  if (!bothReady() || swapping.value) return;
  const slot = inactiveSlot();
  const expectedId = resolvedYoutubeId(track);
  if (isSlotReadyForVideo(slot, expectedId)) return;
  void prefetchNextTrack(track);
}

function playSlot(slot: Slot, track: YoutubePlayerTrack, options: { restart?: boolean } = {}) {
  const player = slotPlayer(slot);
  if (!player) return;

  const restart = options.restart !== false;

  try {
    player.unMute();
    player.setVolume?.(100);

    if (loadedIds.value[slot] === track.youtubeId) {
      if (restart) {
        try {
          const state = player.getPlayerState();
          if (state === YT_PLAYER_STATE.PAUSED || state === YT_PLAYER_STATE.CUED) {
            player.playVideo();
          } else {
            player.seekTo?.(0, true);
            player.playVideo();
          }
        } catch {
          player.playVideo();
        }
      } else {
        player.playVideo();
      }
    } else {
      player.loadVideoById(track.youtubeId, 0);
      loadedIds.value[slot] = track.youtubeId;
    }
    preloadedReady.value[slot] = '';
    pauseAfterLoadSlot.value = null;
  } catch {
    /* ignore */
  }
}

async function ensurePlaying(slot: Slot, track: YoutubePlayerTrack): Promise<void> {
  playSlot(slot, track);

  const ok = await waitForPlayerState(
    slot,
    [YT_PLAYER_STATE.PLAYING, YT_PLAYER_STATE.BUFFERING],
    PLAY_WAIT_MS,
  );

  if (!ok) {
    try {
      slotPlayer(slot)?.loadVideoById(track.youtubeId, 0);
      slotPlayer(slot)?.playVideo();
      await waitForPlayerState(slot, [YT_PLAYER_STATE.PLAYING, YT_PLAYER_STATE.BUFFERING], 2000);
    } catch {
      /* ignore */
    }
  }
}

async function revealActiveSlot(slot: Slot) {
  await nextTick();
  refreshVisiblePlayer(slot);
  try {
    const player = slotPlayer(slot);
    player?.unMute();
    player?.setVolume?.(100);
    player?.playVideo();
  } catch {
    /* ignore */
  }
  requestAnimationFrame(() => refreshVisiblePlayer(slot));
  setTimeout(() => refreshVisiblePlayer(slot), 120);
}

async function preparePlaybackTrack(
  track: YoutubePlayerTrack,
  options: { silent?: boolean } = {},
): Promise<YoutubePlayerTrack | null> {
  const silent = options.silent === true;
  const cached = getCachedTrackResolution(track.id);
  if (cached?.ok) {
    return trackFromResolved(track, cached.youtubeId, cached.title);
  }

  if (!silent) fallbackLoading.value = true;
  try {
    const result = await resolveTrackForPlayback(toPlaybackSource(track));

    if (result.ok) {
      return trackFromResolved(track, result.youtubeId, result.title);
    }

    if (!silent) {
      toast.warning('Este tema no puede reproducirse dentro de la app. Abriendo YouTube.');
    }
    try {
      slotPlayer(activeSlot.value)?.stopVideo();
      loadedIds.value[activeSlot.value] = '';
    } catch {
      /* ignore */
    }
    emit('external-fallback', track);
    return null;
  } finally {
    if (!silent) fallbackLoading.value = false;
  }
}

async function handleEmbedBlocked(track: YoutubePlayerTrack, code: number) {
  if (resolvingBlocked.value || swapping.value) return;
  resolvingBlocked.value = true;
  markBlocked(track.youtubeId);
  console.log('[YOUTUBE] Error embed en reproducción:', code, track.youtubeId);

  try {
    slotPlayer(activeSlot.value)?.stopVideo();
    loadedIds.value[activeSlot.value] = '';
    preloadedReady.value[activeSlot.value] = '';
  } catch {
    /* ignore */
  }

  fallbackLoading.value = true;
  try {
    const result = await handleBlockedVideo(toPlaybackSource(track));

    if (result.ok) {
      await activateTrackInner({
        ...track,
        youtubeId: result.youtubeId,
        title: result.title,
      });
      return;
    }

    toast.warning('Este tema no puede reproducirse dentro de la app. Abriendo YouTube.');
    emit('external-fallback', track);
    if (props.syncToBackend) {
      emit('need-sync');
    } else if (props.nextTrack) {
      await skipToNext(true);
    } else {
      await finishCurrentTrack(true);
    }
  } finally {
    fallbackLoading.value = false;
    resolvingBlocked.value = false;
  }
}

async function activateTrack(track: YoutubePlayerTrack) {
  if (!bothReady() || resolvingBlocked.value) return;

  const prepared = await preparePlaybackTrack(track);
  if (!prepared) {
    if (props.syncToBackend) {
      emit('need-sync');
    } else if (props.nextTrack) {
      await skipToNext(true);
    }
    return;
  }

  await activateTrackInner(prepared);
}

async function activateTrackInner(track: YoutubePlayerTrack) {
  if (isTrackActiveOnPlayer(track)) {
    syncPlayerStateFromSlot(activeSlot.value);
    autoplayBlocked.value = false;
    updateProgress();
    emit('playing', track);
    void prefetchNextTrack(props.nextTrack);
    return;
  }

  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;

  const youtubeId = track.youtubeId;
  let preloadedSlot: Slot | null = null;

  for (const slot of ['a', 'b'] as Slot[]) {
    if (getVideoId(slot) === youtubeId) {
      preloadedSlot = slot;
      break;
    }
  }

  if (preloadedSlot && preloadedSlot !== activeSlot.value) {
    const oldSlot = activeSlot.value;
    swapping.value = true;
    try {
      await ensurePlaying(preloadedSlot, track);
      activeSlot.value = preloadedSlot;
      syncPlayerStateFromSlot(preloadedSlot);
      await revealActiveSlot(preloadedSlot);

      try {
        slotPlayer(oldSlot)?.stopVideo();
        loadedIds.value[oldSlot] = '';
        preloadedReady.value[oldSlot] = '';
      } catch {
        /* ignore */
      }
    } finally {
      swapping.value = false;
    }
  } else {
    const slot = preloadedSlot ?? activeSlot.value;
    if (slot !== activeSlot.value) activeSlot.value = slot;
    await ensurePlaying(slot, track);
    await revealActiveSlot(slot);
  }

  syncPlayerStateFromSlot(activeSlot.value);
  autoplayBlocked.value = false;
  updateProgress();
  activeTrackId.value = track.id;
  emit('playing', track);
  void prefetchNextTrack(props.nextTrack);
}

async function performEarlySwap(options: { emitSync?: boolean } = {}) {
  const emitSync = options.emitSync !== false;

  if (!props.currentTrack || swapping.value) return;
  if (swappedTrackId.value === props.currentTrack.id) return;

  const finished = props.currentTrack;
  const next = props.nextTrack;

  if (!next) {
    await finishCurrentTrack(emitSync);
    return;
  }

  const nextSlot = inactiveSlot();
  const oldSlot = activeSlot.value;
  const currentPlayer = slotPlayer(oldSlot);
  if (!slotPlayer(nextSlot)) return;

  swapping.value = true;
  swappedTrackId.value = finished.id;

  const preparedNext = await preparePlaybackTrack(next, { silent: true });
  if (!preparedNext) {
    swapping.value = false;
    swappedTrackId.value = null;
    if (props.syncToBackend) emit('need-sync');
    return;
  }

  const preloaded = isSlotReadyForVideo(nextSlot, preparedNext.youtubeId);

  if (preloaded) {
    playSlot(nextSlot, preparedNext, { restart: false });
    await waitForPlayerState(
      nextSlot,
      [YT_PLAYER_STATE.PLAYING, YT_PLAYER_STATE.BUFFERING],
      PLAY_WAIT_MS,
    );
    activeSlot.value = nextSlot;
    syncPlayerStateFromSlot(nextSlot);
    await revealActiveSlot(nextSlot);
  } else {
    await ensurePlaying(nextSlot, preparedNext);
    activeSlot.value = nextSlot;
    syncPlayerStateFromSlot(nextSlot);
    await revealActiveSlot(nextSlot);
  }

  activeTrackId.value = preparedNext.id;

  // Parar player anterior
  try {
    currentPlayer?.stopVideo();
    loadedIds.value[oldSlot] = '';
    preloadedReady.value[oldSlot] = '';
  } catch {
    /* ignore */
  }

  emit('playing', preparedNext);
  if (emitSync && props.syncToBackend) {
    emit('ended', finished);
    emit('need-sync');
  } else if (emitSync) {
    emit('ended', finished);
  }

  swapping.value = false;
  updateProgress();
  void prefetchNextTrack(props.nextTrack);
}

async function finishCurrentTrack(emitSync: boolean) {
  if (!props.currentTrack || swapping.value) return;
  if (swappedTrackId.value === props.currentTrack.id) return;

  swapping.value = true;
  swappedTrackId.value = props.currentTrack.id;

  try {
    slotPlayer(activeSlot.value)?.pauseVideo();
  } catch {
    /* ignore */
  }

  if (emitSync && props.syncToBackend) {
    emit('ended', props.currentTrack);
    emit('need-sync');
    emit('queue-empty');
  } else if (emitSync) {
    emit('ended', props.currentTrack);
    emit('queue-empty');
  }

  swapping.value = false;
}

async function handleEndedFallback() {
  if (!props.currentTrack || swappedTrackId.value === props.currentTrack.id) return;
  await performEarlySwap({ emitSync: true });
}

async function skipToNext(fromError = false) {
  if (!props.nextTrack) {
    if (fromError && props.currentTrack) emit('error', props.currentTrack, -1);
    await finishCurrentTrack(true);
    return;
  }
  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;
  await performEarlySwap({ emitSync: true });
}

function checkTransitionWindow() {
  if (!bothReady() || swapping.value || !props.currentTrack) return;

  const player = slotPlayer(activeSlot.value);
  if (!player) return;

  updateProgress();

  const state = player.getPlayerState();
  if (state !== YT_PLAYER_STATE.PLAYING && state !== YT_PLAYER_STATE.BUFFERING) return;

  const duration = player.getDuration();
  const current = player.getCurrentTime();
  if (!duration || duration <= 0) return;

  const remaining = duration - current;
  const next = props.nextTrack;

  if (next) void prefetchNextTrack(next);
  if (swappedTrackId.value === props.currentTrack.id) return;
  if (!next) return;

  if (remaining <= PREBUFFER_SECONDS && remaining > SWAP_SECONDS) {
    prebufferNext(next);
  }

  if (duration >= MIN_DURATION_FOR_EARLY_SWAP && remaining <= SWAP_SECONDS) {
    void performEarlySwap({ emitSync: true });
  }
}

function startTick() {
  stopTick();
  tickTimer = setInterval(checkTransitionWindow, TICK_MS);
}

function stopTick() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function resumePlayback() {
  autoplayBlocked.value = false;
  const track = props.currentTrack;
  if (track) void ensurePlaying(activeSlot.value, track);
}

function forceSkip() {
  void performEarlySwap({ emitSync: false });
}

function switchToTrack(track: YoutubePlayerTrack) {
  void applyTrackChange(track);
}

let trackChangeToken = 0;

async function applyTrackChange(track: YoutubePlayerTrack) {
  if (swapping.value) return;

  const token = ++trackChangeToken;

  const deadline = Date.now() + 12_000;
  while (!bothReady() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 80));
  }
  if (!bothReady() || token !== trackChangeToken) return;

  await activateTrack(track);
}

defineExpose({ forceSkip, resumePlayback, togglePlayPause, switchToTrack, isPlayingTrack });

watch(
  () => props.currentTrack?.id,
  (id, prev) => {
    if (!id || id === prev || !props.currentTrack) return;
    if (swapping.value) return;
    if (isTrackActiveOnPlayer(props.currentTrack)) {
      swappedTrackId.value = null;
      return;
    }
    swappedTrackId.value = null;
    void applyTrackChange(props.currentTrack);
  },
);

watch(
  () => props.nextTrack?.id,
  (id, prev) => {
    if (!id || id === prev) return;
    void prefetchNextTrack(props.nextTrack);
  },
);

onMounted(() => {
  void initPlayers();
  if (props.businessId && props.syncPlayback) {
    unregPlaybackSync = onPlaybackSync((cmd) => applyRemotePlayback(cmd));
  }
});

onBeforeUnmount(() => {
  unregPlaybackSync?.();
  destroyed = true;
  stopTick();
  try {
    playerA.value?.destroy();
    playerB.value?.destroy();
  } catch {
    /* ignore */
  }
});
</script>

<style scoped>
[id$='-a'] :deep(iframe),
[id$='-b'] :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  border: none;
}
</style>
