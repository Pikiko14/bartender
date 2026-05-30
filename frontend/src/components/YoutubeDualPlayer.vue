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
import { useMusicStore } from '@/stores/music.store';
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

const emit = defineEmits<{
  ended: [track: YoutubePlayerTrack];
  error: [track: YoutubePlayerTrack, code: number];
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
  if (props.nextTrack && preloadedReady.value[inactiveSlot()] === props.nextTrack.youtubeId) {
    return '⏭ Siguiente listo';
  }
  if (playerState.value === YT_PLAYER_STATE.BUFFERING) return 'Buffering…';
  if (playerState.value === YT_PLAYER_STATE.PLAYING) {
    return activeSlot.value === 'a' ? '▶ Player A' : '▶ Player B';
  }
  if (playerState.value === YT_PLAYER_STATE.PAUSED) return 'Pausado';
  return '';
});

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
      if (slot === activeSlot.value && props.currentTrack) {
        emit('error', props.currentTrack, event.data ?? -1);
        void skipToNext(true);
      }
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
  preloadNext(props.nextTrack);
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

/** Precarga en player inactivo: loadVideoById + pausa en mute. */
function preloadNext(track: YoutubePlayerTrack | null) {
  if (!track || !bothReady() || swapping.value) return;
  const slot = inactiveSlot();
  if (loadedIds.value[slot] === track.youtubeId && preloadedReady.value[slot] === track.youtubeId) {
    return;
  }
  if (loadedIds.value[slot] === track.youtubeId && pauseAfterLoadSlot.value === slot) return;

  try {
    slotPlayer(slot)?.mute();
    loadIntoSlot(slot, track.youtubeId);
    pauseAfterLoadSlot.value = slot;
  } catch {
    /* ignore */
  }
}

/** A ~8 s del final: asegurar que el inactivo ya cargó el video. */
function prebufferNext(track: YoutubePlayerTrack) {
  if (!bothReady() || swapping.value) return;
  const slot = inactiveSlot();
  if (preloadedReady.value[slot] === track.youtubeId) return;
  preloadNext(track);
}

function playSlot(slot: Slot, track: YoutubePlayerTrack) {
  const player = slotPlayer(slot);
  if (!player) return;

  try {
    player.unMute();
    player.setVolume?.(100);

    if (loadedIds.value[slot] === track.youtubeId) {
      player.seekTo?.(0, true);
      player.playVideo();
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

function activateTrack(track: YoutubePlayerTrack) {
  if (!bothReady()) return;

  swappedTrackId.value = null;
  pauseAfterLoadSlot.value = null;

  const youtubeId = track.youtubeId;
  const slots: Slot[] = ['a', 'b'];

  for (const slot of slots) {
    if (getVideoId(slot) !== youtubeId) continue;

    if (activeSlot.value !== slot) {
      try {
        slotPlayer(activeSlot.value)?.stopVideo();
        loadedIds.value[activeSlot.value] = '';
        preloadedReady.value[activeSlot.value] = '';
      } catch {
        /* ignore */
      }
      activeSlot.value = slot;
    }

    playSlot(slot, track);
    syncPlayerStateFromSlot(slot);
    emit('playing', track);
    void nextTick().then(() => refreshVisiblePlayer(slot));
    preloadNext(props.nextTrack);
    return;
  }

  playSlot(activeSlot.value, track);
  syncPlayerStateFromSlot(activeSlot.value);
  emit('playing', track);
  void nextTick().then(() => refreshVisiblePlayer(activeSlot.value));
  preloadNext(props.nextTrack);
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

  // 1) Arrancar siguiente en player alterno (detrás, en mute si hace falta)
  await ensurePlaying(nextSlot, next);

  // 2) Cuando ya reproduce → hacer visible (swap z-index)
  activeSlot.value = nextSlot;
  syncPlayerStateFromSlot(nextSlot);

  await nextTick();
  refreshVisiblePlayer(nextSlot);

  // 3) Forzar play + repaint tras volverse visible
  try {
    const visible = slotPlayer(nextSlot);
    visible?.unMute();
    visible?.setVolume?.(100);
    visible?.playVideo();
  } catch {
    /* ignore */
  }

  requestAnimationFrame(() => refreshVisiblePlayer(nextSlot));

  // 4) Parar player anterior
  try {
    currentPlayer?.stopVideo();
    loadedIds.value[oldSlot] = '';
    preloadedReady.value[oldSlot] = '';
  } catch {
    /* ignore */
  }

  emit('playing', next);
  if (emitSync && props.syncToBackend) {
    emit('ended', finished);
    emit('need-sync');
  } else if (emitSync) {
    emit('ended', finished);
  }

  swapping.value = false;
  updateProgress();
  preloadNext(props.nextTrack);
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

  if (next) preloadNext(next);
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

async function applyTrackChange(track: YoutubePlayerTrack) {
  if (swapping.value) return;

  const deadline = Date.now() + 12_000;
  while (!bothReady() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 80));
  }
  if (!bothReady()) return;

  activateTrack(track);
}

defineExpose({ forceSkip, resumePlayback, togglePlayPause, switchToTrack });

watch(
  () => props.currentTrack?.id,
  (id, prev) => {
    if (!id || id === prev || !props.currentTrack) return;
    if (swapping.value) return;
    void applyTrackChange(props.currentTrack);
  },
);

watch(
  () => props.nextTrack?.youtubeId,
  (id, prev) => {
    if (id === prev) return;
    if (id) preloadNext(props.nextTrack);
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
