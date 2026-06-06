<template>
  <div
    ref="rootEl"
    class="relative w-full overflow-hidden bg-black"
    :class="fill ? 'h-full rounded-none' : 'aspect-video rounded-xl'"
  >
    <div
      v-if="showPoster"
      class="pointer-events-none absolute inset-0 z-[15] bg-cover bg-center"
      :style="posterStyle"
      aria-hidden="true"
    />

    <!-- Slot visible: opacity 100. Slot de precarga (siguiente): invisible pero con tamaño real (px vía rootEl). -->
    <div
      class="absolute inset-0 h-full w-full"
      :class="displaySlot === 'a' ? 'yt-slot-visible' : 'yt-slot-hidden'"
      :aria-hidden="displaySlot !== 'a'"
    >
      <div :id="elementIds.a" class="relative h-full w-full" />
    </div>
    <div
      class="absolute inset-0 h-full w-full"
      :class="displaySlot === 'b' ? 'yt-slot-visible' : 'yt-slot-hidden'"
      :aria-hidden="displaySlot !== 'b'"
    >
      <div :id="elementIds.b" class="relative h-full w-full" />
    </div>

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
      <div class="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <span class="shrink-0">{{ formatTime(elapsedSec) }}</span>
        <span class="min-w-0 flex-1 truncate text-center text-slate-400">{{ statusLabel }}</span>
        <span v-if="remainingSec > 0" class="shrink-0">-{{ formatTime(remainingSec) }}</span>
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
  clearTrackResolution,
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
  'resolved-alternative': [payload: { track: YoutubePlayerTrack; youtubeId: string; title: string }];
  'playback-unavailable': [track: YoutubePlayerTrack];
  'need-sync': [];
  playing: [track: YoutubePlayerTrack];
  'queue-empty': [];
}>();

type Slot = 'a' | 'b';

const instanceId = `yt-${Math.random().toString(36).slice(2, 9)}`;
const elementIds = reactive({ a: `${instanceId}-a`, b: `${instanceId}-b` });
const rootEl = ref<HTMLElement | null>(null);

const activeSlot = ref<Slot>('a');
/** Slot mostrado al usuario; solo cambia cuando el iframe ya tiene vídeo listo. */
const displaySlot = ref<Slot>('a');
const videoFrameVisible = ref(false);
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
/** Autoplay con mute inicial (política del navegador en pantallas DJ/TV). */
const pendingDjUnmute = ref(false);
let startingCurrentTrack = false;

let tickTimer: ReturnType<typeof setInterval> | null = null;
let unregPlaybackSync: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;
let destroyed = false;

const isPlaying = computed(
  () =>
    playerState.value === YT_PLAYER_STATE.PLAYING ||
    playerState.value === YT_PLAYER_STATE.BUFFERING,
);

const queueEmptySoon = computed(
  () => props.currentTrack && !props.nextTrack && playerState.value === YT_PLAYER_STATE.PLAYING,
);

const posterYoutubeId = computed(() => {
  const track = props.currentTrack;
  if (!track?.youtubeId) return '';
  const cached = getCachedTrackResolution(track.id);
  return cached?.ok ? cached.youtubeId : track.youtubeId;
});

const showPoster = computed(() => {
  if (!posterYoutubeId.value || fallbackLoading.value || autoplayBlocked.value) return false;
  if (videoFrameVisible.value) return false;
  if (swapping.value && slotShowsVideo(displaySlot.value)) return false;
  return true;
});

const posterStyle = computed(() => ({
  backgroundImage: `url(https://img.youtube.com/vi/${posterYoutubeId.value}/hqdefault.jpg)`,
}));

function nextTrackDisplayTitle(): string {
  const next = props.nextTrack;
  if (!next) return '';
  const resolved = getCachedTrackResolution(next.id);
  return resolved?.ok ? resolved.title : next.title;
}

const statusLabel = computed(() => {
  if (swapping.value) return 'Transición DJ…';
  if (!videoFrameVisible.value && props.currentTrack) return 'Cargando vídeo…';
  const nextTitle = nextTrackDisplayTitle();
  if (nextTitle) {
    const nextYid = resolvedNextYoutubeId();
    const ready = !!nextYid && preloadedReady.value[inactiveSlot()] === nextYid;
    return ready ? `Siguiente: ${nextTitle} (Listo)` : `Siguiente: ${nextTitle}`;
  }
  if (playerState.value === YT_PLAYER_STATE.BUFFERING) return 'Buffering…';
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

function resolvedNextYoutubeId(): string {
  const next = props.nextTrack;
  if (!next?.youtubeId) return '';
  return resolvedYoutubeId(next);
}

/** Slot oculto con el siguiente tema en cola (precarga). Nunca debe mostrarse hasta el swap. */
function isSlotHoldingNextPrefetch(slot: Slot, activatingYoutubeId?: string): boolean {
  if (swapping.value || !props.nextTrack) return false;
  const onAir = getVideoId(slot);
  if (activatingYoutubeId && onAir === activatingYoutubeId) return false;
  const nextYid = resolvedNextYoutubeId();
  if (!nextYid) return false;
  if (slot === displaySlot.value) return false;
  if (onAir === nextYid) return true;
  return preloadedReady.value[slot] === nextYid;
}

function keepPrefetchSlotHidden(slot: Slot) {
  if (!isSlotHoldingNextPrefetch(slot)) return;
  try {
    const player = slotPlayer(slot);
    if (!player) return;
    const state = player.getPlayerState();
    if (state === YT_PLAYER_STATE.PLAYING || state === YT_PLAYER_STATE.BUFFERING) {
      player.pauseVideo();
    }
    player.mute();
  } catch {
    /* ignore */
  }
}

function isSlotReadyForVideo(slot: Slot, youtubeId: string): boolean {
  if (!slotHasLoadedVideo(slot, youtubeId)) return false;
  try {
    const state = slotPlayer(slot)?.getPlayerState();
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
  return displaySlot.value === 'a' ? 'b' : 'a';
}

function slotShowsVideo(slot: Slot): boolean {
  try {
    const id = getVideoId(slot);
    if (!id || loadedIds.value[slot] !== id) return false;
    const state = slotPlayer(slot)?.getPlayerState();
    return (
      state === YT_PLAYER_STATE.PLAYING ||
      state === YT_PLAYER_STATE.BUFFERING ||
      state === YT_PLAYER_STATE.PAUSED
    );
  } catch {
    return false;
  }
}

/** Dónde cargar la pista actual: reutilizar precarga si ya tiene ese vídeo. */
function pickTargetSlot(youtubeId: string): Slot {
  const existing = findSlotWithVideo(youtubeId, true);
  if (existing && !isSlotHoldingNextPrefetch(existing, youtubeId)) return existing;
  if (slotShowsVideo(displaySlot.value)) return inactiveSlot();
  return displaySlot.value;
}

async function waitForVisibleFrame(
  slot: Slot,
  youtubeId: string,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (destroyed) return false;
    if (getVideoId(slot) !== youtubeId) {
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }
    try {
      const player = slotPlayer(slot);
      const state = player?.getPlayerState();
      refreshPlayerSize(slot);
      if (state === YT_PLAYER_STATE.PLAYING) {
        return true;
      }
      if (state === YT_PLAYER_STATE.BUFFERING) {
        const duration = player?.getDuration() ?? 0;
        if (duration > 0) {
          return true;
        }
      }
      if (state === YT_PLAYER_STATE.PAUSED) {
        const duration = player?.getDuration() ?? 0;
        if (duration > 0) {
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  return false;
}

function markVideoFrameVisible(slot: Slot) {
  videoFrameVisible.value = true;
  refreshVisiblePlayer(slot);
}

function markVideoFrameHidden() {
  videoFrameVisible.value = false;
}

function getVideoId(slot: Slot): string {
  try {
    return slotPlayer(slot)?.getVideoData()?.video_id ?? '';
  } catch {
    return '';
  }
}

function slotHasLoadedVideo(slot: Slot, youtubeId: string): boolean {
  if (!youtubeId || loadedIds.value[slot] !== youtubeId) return false;
  const onAir = getVideoId(slot);
  if (onAir === youtubeId) return true;
  return preloadedReady.value[slot] === youtubeId;
}

function isVideoShowingTrack(track: YoutubePlayerTrack, slot: Slot = displaySlot.value): boolean {
  const expected = resolvedYoutubeId(track);
  const onAir = getVideoId(slot);
  if (!onAir) return false;
  return onAir === expected || onAir === track.youtubeId;
}

function isTrackActiveOnPlayer(track: YoutubePlayerTrack): boolean {
  if (swapping.value || !track.youtubeId) return false;
  if (activeTrackId.value !== track.id) return false;
  if (!isVideoShowingTrack(track)) return false;
  try {
    const state = slotPlayer(displaySlot.value)?.getPlayerState();
    return (
      state === YT_PLAYER_STATE.PLAYING ||
      state === YT_PLAYER_STATE.BUFFERING ||
      state === YT_PLAYER_STATE.PAUSED
    );
  } catch {
    return false;
  }
}

function isPlayingTrack(trackOrId: string | YoutubePlayerTrack): boolean {
  const track =
    typeof trackOrId === 'string'
      ? props.currentTrack?.id === trackOrId
        ? props.currentTrack
        : null
      : trackOrId;
  if (!track) return false;
  return isTrackActiveOnPlayer(track);
}


function getPlayerAreaSize(): { w: number; h: number } {
  const el = rootEl.value;
  if (el && el.clientWidth > 0 && el.clientHeight > 0) {
    return { w: el.clientWidth, h: el.clientHeight };
  }
  return { w: 640, h: 360 };
}

function refreshPlayerSize(slot: Slot) {
  const player = slotPlayer(slot);
  if (!player) return;
  try {
    const { w, h } = getPlayerAreaSize();
    player.setSize?.(w, h);
    const iframe = player.getIframe?.();
    if (iframe) {
      iframe.style.position = 'absolute';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = `${w}px`;
      iframe.style.height = `${h}px`;
      iframe.style.border = 'none';
      iframe.style.display = 'block';
      iframe.style.maxWidth = 'none';
    }
  } catch {
    /* ignore */
  }
}

function refreshBothPlayerSizes() {
  refreshPlayerSize('a');
  refreshPlayerSize('b');
}

/** Si el vídeo actual suena en el slot oculto (no precarga), mostrar ese slot. */
function reconcileDisplaySlotForTrack() {
  if (swapping.value || !props.currentTrack?.youtubeId) return;
  const yid = resolvedYoutubeId(props.currentTrack);
  if (getVideoId(displaySlot.value) === yid && slotShowsVideo(displaySlot.value)) return;

  for (const slot of ['a', 'b'] as Slot[]) {
    if (isSlotHoldingNextPrefetch(slot)) continue;
    if (getVideoId(slot) !== yid) continue;
    const state = slotPlayer(slot)?.getPlayerState();
    if (
      state === YT_PLAYER_STATE.PLAYING ||
      state === YT_PLAYER_STATE.BUFFERING ||
      state === YT_PLAYER_STATE.PAUSED
    ) {
      void showDisplaySlot(slot);
      return;
    }
  }
}

/** Alias usado en el resto del componente. */
function refreshVisiblePlayer(slot: Slot) {
  refreshPlayerSize(slot);
}

function pauseSlot(slot: Slot) {
  try {
    const player = slotPlayer(slot);
    player?.pauseVideo();
    player?.mute();
  } catch {
    /* ignore */
  }
}

async function showDisplaySlot(slot: Slot) {
  const previous = displaySlot.value;
  if (previous !== slot) {
    pauseSlot(previous);
  }

  displaySlot.value = slot;
  activeSlot.value = slot;
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  refreshPlayerSize(slot);
  try {
    const player = slotPlayer(slot);
    if (props.djMode) {
      if (pendingDjUnmute.value) player?.mute();
      else {
        player?.unMute();
        player?.setVolume?.(100);
      }
    } else {
      player?.unMute();
      player?.setVolume?.(100);
    }
    player?.playVideo();
  } catch {
    /* ignore */
  }
  refreshPlayerSize(slot);
  refreshBothPlayerSizes();
  setTimeout(() => {
    refreshPlayerSize(slot);
    reconcileDisplaySlotForTrack();
  }, 120);
  setTimeout(() => refreshPlayerSize(slot), 400);
}

function syncPlayerStateFromSlot(slot: Slot) {
  try {
    playerState.value = slotPlayer(slot)?.getPlayerState() ?? null;
  } catch {
    /* ignore */
  }
}

function updateProgress() {
  const player = slotPlayer(displaySlot.value);
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
  const youtubeId = getVideoId(displaySlot.value) || props.currentTrack?.youtubeId;
  if (!youtubeId) return;
  music.sendPlaybackControl(props.businessId, {
    action,
    youtubeId,
    at: getCurrentTimeSafe(displaySlot.value),
  });
}

function applyRemotePlayback(cmd: PlaybackSyncCommand) {
  if (!bothReady() || !props.syncPlayback) return;

  suppressPlaybackBroadcast.value = true;
  try {
    const slot = displaySlot.value;
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
  const player = slotPlayer(displaySlot.value);
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
      void nextTick().then(() => {
        refreshBothPlayerSizes();
        requestAnimationFrame(() => refreshBothPlayerSizes());
      });
      maybeStart();
    },
    onStateChange: (event: { data: number }) => {
      if (!swapping.value && isSlotHoldingNextPrefetch(slot)) {
        if (
          event.data === YT_PLAYER_STATE.PLAYING ||
          event.data === YT_PLAYER_STATE.BUFFERING
        ) {
          keepPrefetchSlotHidden(slot);
        }
        if (event.data === YT_PLAYER_STATE.CUED && getVideoId(slot) === resolvedNextYoutubeId()) {
          preloadedReady.value[slot] = loadedIds.value[slot];
        }
        return;
      }

      // Pausar precarga en player inactivo en cuanto empiece a cargar
      if (
        !swapping.value &&
        slot !== displaySlot.value &&
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

      if (
        !swapping.value &&
        props.currentTrack &&
        !isSlotHoldingNextPrefetch(slot) &&
        (event.data === YT_PLAYER_STATE.PLAYING || event.data === YT_PLAYER_STATE.BUFFERING) &&
        getVideoId(slot) === resolvedYoutubeId(props.currentTrack) &&
        slot !== displaySlot.value
      ) {
        reconcileDisplaySlotForTrack();
      }

      if (slot !== activeSlot.value && slot !== displaySlot.value) return;

      const isDisplayed = slot === displaySlot.value;
      const prev = prevActivePlayerState.value;
      if (isDisplayed) {
        playerState.value = event.data;
      }

      if (
        !swapping.value &&
        !suppressPlaybackBroadcast.value &&
        props.businessId &&
        props.syncPlayback &&
        isDisplayed
      ) {
        if (event.data === YT_PLAYER_STATE.PAUSED && prev === YT_PLAYER_STATE.PLAYING) {
          broadcastPlaybackState('pause');
        }
        if (event.data === YT_PLAYER_STATE.PLAYING && prev === YT_PLAYER_STATE.PAUSED) {
          broadcastPlaybackState('play');
        }
      }
      prevActivePlayerState.value = event.data;

      if (event.data === YT_PLAYER_STATE.ENDED && !swapping.value && isDisplayed) {
        void handleEndedFallback();
      }
      if (event.data === YT_PLAYER_STATE.PLAYING) {
        refreshPlayerSize(slot);
        if (isDisplayed) {
          autoplayBlocked.value = false;
          markVideoFrameVisible(slot);
        } else {
          reconcileDisplaySlotForTrack();
        }
        if (props.djMode && pendingDjUnmute.value && isDisplayed) {
          try {
            slotPlayer(slot)?.unMute();
            slotPlayer(slot)?.setVolume?.(100);
          } catch {
            /* ignore */
          }
          pendingDjUnmute.value = false;
        }
        if (isDisplayed) updateProgress();
      }
      if (event.data === YT_PLAYER_STATE.BUFFERING && isDisplayed) {
        refreshPlayerSize(slot);
        markVideoFrameVisible(slot);
        updateProgress();
      }
      if (event.data === YT_PLAYER_STATE.BUFFERING && !isDisplayed && !isSlotHoldingNextPrefetch(slot)) {
        reconcileDisplaySlotForTrack();
      }
      if (event.data === YT_PLAYER_STATE.UNSTARTED && isDisplayed) {
        autoplayBlocked.value = true;
        if (props.djMode && slot === displaySlot.value) {
          try {
            pendingDjUnmute.value = true;
            slotPlayer(slot)?.mute();
            slotPlayer(slot)?.playVideo();
          } catch {
            /* ignore */
          }
        }
      }
    },
    onError: (event: { data: number }) => {
      if (slot !== displaySlot.value || !props.currentTrack || resolvingBlocked.value) return;
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
    width: getPlayerAreaSize().w,
    height: getPlayerAreaSize().h,
    playerVars: baseVars(),
    events: makeHandlers('a'),
  });

  playerB.value = new window.YT.Player(elementIds.b, {
    width: getPlayerAreaSize().w,
    height: getPlayerAreaSize().h,
    playerVars: baseVars(),
    events: makeHandlers('b'),
  });

  await nextTick();
  refreshBothPlayerSizes();
}

function bothReady() {
  return ready.value.a && ready.value.b;
}

async function maybeStart() {
  if (!bothReady() || !props.currentTrack || startingCurrentTrack) return;
  startingCurrentTrack = true;
  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;
  await nextTick();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  refreshBothPlayerSizes();
  try {
    await activateTrack(props.currentTrack);
    reconcileDisplaySlotForTrack();
    refreshPlayerSize(displaySlot.value);
    setTimeout(() => refreshPlayerSize(displaySlot.value), 250);
  } finally {
    startingCurrentTrack = false;
  }
  void prefetchNextTrack(props.nextTrack);
  startTick();
}

/** Precarga sin autoplay (cue) en el slot oculto. */
function prefetchIntoSlot(slot: Slot, youtubeId: string) {
  const player = slotPlayer(slot);
  if (!player) return;
  if (getVideoId(slot) === youtubeId && loadedIds.value[slot] === youtubeId) return;
  try {
    player.cueVideoById(youtubeId, 0);
    loadedIds.value[slot] = youtubeId;
    preloadedReady.value[slot] = youtubeId;
    refreshPlayerSize(slot);
  } catch {
    /* ignore */
  }
}

/** Carga y reproduce en un slot. */
function loadIntoSlot(slot: Slot, youtubeId: string) {
  const player = slotPlayer(slot);
  if (!player) return;
  if (getVideoId(slot) === youtubeId && loadedIds.value[slot] === youtubeId) return;
  try {
    player.loadVideoById(youtubeId, 0);
    loadedIds.value[slot] = youtubeId;
    preloadedReady.value[slot] = '';
    refreshPlayerSize(slot);
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
    if (slot === displaySlot.value) return;
    if (isSlotReadyForVideo(slot, youtubeId)) return;
    if (loadedIds.value[slot] === youtubeId && pauseAfterLoadSlot.value === slot) return;

    try {
      slotPlayer(slot)?.mute();
      prefetchIntoSlot(slot, youtubeId);
      pauseAfterLoadSlot.value = null;
      keepPrefetchSlotHidden(slot);
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

function findSlotWithVideo(youtubeId: string, preferInactive = false): Slot | null {
  const order: Slot[] = preferInactive
    ? [inactiveSlot(), displaySlot.value]
    : [displaySlot.value, inactiveSlot()];

  for (const slot of order) {
    if (getVideoId(slot) === youtubeId) return slot;
    if (slotHasLoadedVideo(slot, youtubeId)) return slot;
  }
  return null;
}

function releasePrefetchHold(slot: Slot) {
  if (pauseAfterLoadSlot.value === slot) {
    pauseAfterLoadSlot.value = null;
  }
}

function playSlot(slot: Slot, track: YoutubePlayerTrack, options: { restart?: boolean } = {}) {
  const player = slotPlayer(slot);
  if (!player) return;

  releasePrefetchHold(slot);

  const restart = options.restart !== false;
  const onAir = getVideoId(slot);
  const hasVideo = onAir === track.youtubeId && loadedIds.value[slot] === track.youtubeId;
  const useMutedAutoplay = props.djMode;

  try {
    if (useMutedAutoplay) {
      player.mute();
      pendingDjUnmute.value = true;
    } else {
      player.unMute();
      player.setVolume?.(100);
    }

    if (hasVideo) {
      if (restart) {
        try {
          const state = player.getPlayerState();
          if (state === YT_PLAYER_STATE.PAUSED || state === YT_PLAYER_STATE.CUED) {
            player.playVideo();
          } else if (
            state === YT_PLAYER_STATE.PLAYING ||
            state === YT_PLAYER_STATE.BUFFERING
          ) {
            player.seekTo?.(0, true);
            player.playVideo();
          } else {
            player.loadVideoById(track.youtubeId, 0);
            loadedIds.value[slot] = track.youtubeId;
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
    refreshPlayerSize(slot);
  } catch {
    /* ignore */
  }
}

async function ensurePlaying(
  slot: Slot,
  track: YoutubePlayerTrack,
  options: { restart?: boolean } = {},
): Promise<void> {
  playSlot(slot, track, options);

  refreshPlayerSize(slot);

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
  await showDisplaySlot(slot);
}

function whenReady(timeoutMs = 15_000): Promise<boolean> {
  if (bothReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      if (destroyed) {
        resolve(false);
        return;
      }
      if (bothReady()) {
        resolve(true);
        return;
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
      if (result.alternative) {
        emit('resolved-alternative', {
          track,
          youtubeId: result.youtubeId,
          title: result.title,
        });
      }
      return trackFromResolved(track, result.youtubeId, result.title);
    }

    if (!silent) {
      toast.warning('No hay versión reproducible embebida de este tema.');
    }
    try {
      slotPlayer(activeSlot.value)?.stopVideo();
      loadedIds.value[activeSlot.value] = '';
    } catch {
      /* ignore */
    }
    emit('playback-unavailable', track);
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
    const result = await handleBlockedVideo(toPlaybackSource(track), { openExternal: !props.djMode });

    if (result.ok) {
      if (result.alternative) {
        emit('resolved-alternative', {
          track,
          youtubeId: result.youtubeId,
          title: result.title,
        });
      }
      await activateTrackInner({
        ...track,
        youtubeId: result.youtubeId,
        title: result.title,
      });
      return;
    }

    toast.warning('No hay versión reproducible embebida de este tema.');
    emit('playback-unavailable', track);
    emit('external-fallback', track);
    if (props.syncToBackend) {
      return;
    }
    if (props.nextTrack) {
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
      emit('playback-unavailable', track);
    } else if (props.nextTrack) {
      await skipToNext(true);
    } else {
      await finishCurrentTrack(true);
    }
    return;
  }

  await activateTrackInner(prepared);
}

async function swapToPreparedTrack(
  prepared: YoutubePlayerTrack,
  options: { stopOldSlot?: boolean } = {},
): Promise<boolean> {
  const stopOldSlot = options.stopOldSlot !== false;
  const youtubeId = prepared.youtubeId;
  const oldDisplaySlot = displaySlot.value;
  const oldActiveSlot = activeSlot.value;

  const preloaded = findSlotWithVideo(youtubeId, true);
  let targetSlot =
    preloaded && !isSlotHoldingNextPrefetch(preloaded, youtubeId)
      ? preloaded
      : pickTargetSlot(youtubeId);

  releasePrefetchHold(targetSlot);
  pauseAfterLoadSlot.value = null;
  preloadedReady.value[targetSlot] = '';

  swapping.value = true;
  if (!slotShowsVideo(oldDisplaySlot)) {
    markVideoFrameHidden();
  }
  try {
    const resumePreload = preloaded != null && targetSlot === preloaded && targetSlot !== oldDisplaySlot;

    // Mostrar el slot destino antes de esperar frames (el oculto no pinta bien en YouTube).
    if (targetSlot !== oldDisplaySlot) {
      await showDisplaySlot(targetSlot);
    }

    await ensurePlaying(targetSlot, prepared, { restart: !resumePreload });

    let ready = await waitForVisibleFrame(targetSlot, youtubeId, PLAY_WAIT_MS);
    if (!ready) {
      await ensurePlaying(targetSlot, prepared, { restart: true });
      ready = await waitForVisibleFrame(targetSlot, youtubeId, PLAY_WAIT_MS);
    }

    if (!ready) {
      return false;
    }

    if (targetSlot === oldDisplaySlot) {
      await showDisplaySlot(targetSlot);
    }

    syncPlayerStateFromSlot(targetSlot);
    markVideoFrameVisible(targetSlot);

    if (stopOldSlot && oldActiveSlot !== targetSlot) {
      try {
        slotPlayer(oldActiveSlot)?.stopVideo();
        loadedIds.value[oldActiveSlot] = '';
        preloadedReady.value[oldActiveSlot] = '';
      } catch {
        /* ignore */
      }
    }

    activeTrackId.value = prepared.id;
    autoplayBlocked.value = false;
    updateProgress();
    emit('playing', prepared);
    void prefetchNextTrack(props.nextTrack);
    return true;
  } finally {
    swapping.value = false;
  }
}
async function activateTrackInner(track: YoutubePlayerTrack) {
  const sameMeta =
    activeTrackId.value === track.id && slotHasLoadedVideo(displaySlot.value, track.youtubeId);

  if (sameMeta && isTrackActiveOnPlayer(track)) {
    syncPlayerStateFromSlot(displaySlot.value);
    autoplayBlocked.value = false;
    markVideoFrameVisible(displaySlot.value);
    updateProgress();
    emit('playing', track);
    void prefetchNextTrack(props.nextTrack);
    return;
  }

  // Pista distinta o iframe vacío — limpiar estado y cargar de nuevo
  if (activeTrackId.value !== track.id) {
    activeTrackId.value = null;
    swappedTrackId.value = null;
    if (!slotShowsVideo(displaySlot.value)) {
      markVideoFrameHidden();
    }
  }
  for (const slot of ['a', 'b'] as Slot[]) {
    if (loadedIds.value[slot] === track.youtubeId && !slotHasLoadedVideo(slot, track.youtubeId)) {
      loadedIds.value[slot] = '';
      preloadedReady.value[slot] = '';
    }
  }

  swappedTrackId.value = null;
  await swapToPreparedTrack(track);
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

  swappedTrackId.value = finished.id;

  const preparedNext = await preparePlaybackTrack(next, { silent: true });
  if (!preparedNext) {
    swappedTrackId.value = null;
    if (props.syncToBackend) emit('need-sync');
    return;
  }

  await swapToPreparedTrack(preparedNext);

  if (activeTrackId.value !== preparedNext.id) {
    swappedTrackId.value = null;
    if (props.syncToBackend) emit('need-sync');
    return;
  }

  if (emitSync && props.syncToBackend) {
    emit('ended', finished);
    emit('need-sync');
  } else if (emitSync) {
    emit('ended', finished);
  }
}

async function finishCurrentTrack(emitSync: boolean) {
  if (!props.currentTrack || swapping.value) return;
  if (swappedTrackId.value === props.currentTrack.id) return;

  swapping.value = true;
  swappedTrackId.value = props.currentTrack.id;

  try {
    slotPlayer(displaySlot.value)?.pauseVideo();
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

  const player = slotPlayer(displaySlot.value);
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
  if (!track) return;
  if (props.djMode) pendingDjUnmute.value = true;
  void ensurePlaying(displaySlot.value, track);
}

async function forceSkip() {
  if (!props.nextTrack) {
    await finishCurrentTrack(false);
    return;
  }
  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;
  await performEarlySwap({ emitSync: false });
}

function switchToTrack(track: YoutubePlayerTrack, options: { force?: boolean } = {}) {
  void applyTrackChange(track, options);
}

async function applyTrack(track: YoutubePlayerTrack, options: { force?: boolean } = {}): Promise<void> {
  await applyTrackChange(track, options);
}

let trackChangeToken = 0;

async function applyTrackChange(track: YoutubePlayerTrack, options: { force?: boolean } = {}) {
  const force = options.force === true;
  const token = ++trackChangeToken;

  while (swapping.value && !destroyed) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (token !== trackChangeToken) return;

  const deadline = Date.now() + 12_000;
  while (!bothReady() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 80));
  }
  if (!bothReady() || token !== trackChangeToken) return;

  if (!force && activeTrackId.value === track.id && isTrackActiveOnPlayer(track)) return;

  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;

  if (force || activeTrackId.value !== track.id || !isVideoShowingTrack(track)) {
    if (activeTrackId.value !== track.id) {
      activeTrackId.value = null;
    }
    if (!isVideoShowingTrack(track)) {
      pauseSlot(displaySlot.value);
    }
  }

  const youtubeId = resolvedYoutubeId(track);

  const preloadedSlot = findSlotWithVideo(youtubeId, true);
  if (preloadedSlot && preloadedSlot !== displaySlot.value) {
    let prepared: YoutubePlayerTrack | null = null;
    const cached = getCachedTrackResolution(track.id);
    if (cached?.ok) {
      prepared = trackFromResolved(track, cached.youtubeId, cached.title);
    } else {
      prepared = await preparePlaybackTrack(track, { silent: true });
    }
    if (prepared) {
      const ok = await swapToPreparedTrack(prepared);
      if (ok) return;
    }
  }

  if (
    slotHasLoadedVideo(displaySlot.value, youtubeId) &&
    isVideoShowingTrack(track, displaySlot.value)
  ) {
    const prepared = trackFromResolved(track, youtubeId, track.title);
    const sameTrack = activeTrackId.value === track.id;
    activeTrackId.value = track.id;
    await ensurePlaying(displaySlot.value, prepared, { restart: !sameTrack });
    markVideoFrameVisible(displaySlot.value);
    updateProgress();
    emit('playing', prepared);
    void prefetchNextTrack(props.nextTrack);
    return;
  }

  await activateTrack(track);
}

function refreshLayout() {
  refreshBothPlayerSizes();
}

defineExpose({
  forceSkip,
  resumePlayback,
  togglePlayPause,
  switchToTrack,
  applyTrack,
  isPlayingTrack,
  whenReady,
  refreshLayout,
});

watch(
  () => `${props.currentTrack?.id ?? ''}:${props.currentTrack?.youtubeId ?? ''}`,
  (key, prev) => {
    if (!props.currentTrack?.id || key === prev) return;
    if (isTrackActiveOnPlayer(props.currentTrack)) {
      swappedTrackId.value = null;
      return;
    }
    clearTrackResolution(props.currentTrack.id);
    swappedTrackId.value = null;
    void applyTrackChange(props.currentTrack, { force: true });
  },
);

watch(
  () => props.nextTrack?.id,
  (id, prev) => {
    if (!id || id === prev) return;
    void prefetchNextTrack(props.nextTrack);
  },
);

watch(displaySlot, (slot) => {
  void nextTick(() => refreshPlayerSize(slot));
});

onMounted(() => {
  void initPlayers();
  if (props.businessId && props.syncPlayback) {
    unregPlaybackSync = onPlaybackSync((cmd) => applyRemotePlayback(cmd));
  }
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    resizeObserver = new ResizeObserver(() => {
      refreshBothPlayerSizes();
    });
    resizeObserver.observe(rootEl.value);
  }
});

onBeforeUnmount(() => {
  unregPlaybackSync?.();
  resizeObserver?.disconnect();
  resizeObserver = null;
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
.yt-slot-visible {
  z-index: 2;
  visibility: visible;
  opacity: 1;
}

.yt-slot-hidden {
  z-index: 0;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

:deep([id$='-a'] iframe),
:deep([id$='-b'] iframe) {
  position: absolute;
  left: 0;
  top: 0;
  border: none;
  display: block;
  max-width: none;
}
</style>
