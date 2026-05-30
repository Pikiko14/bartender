<template>
  <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
    <!-- Ambos players siempre renderizan el iframe (sin opacity:0) para evitar pantalla negra al alternar -->
    <div
      id="yt-player-a"
      class="absolute inset-0 h-full w-full"
      :class="activeSlot === 'a' ? 'z-20' : 'z-10 pointer-events-none'"
      :aria-hidden="activeSlot !== 'a'"
    />
    <div
      id="yt-player-b"
      class="absolute inset-0 h-full w-full"
      :class="activeSlot === 'b' ? 'z-20' : 'z-10 pointer-events-none'"
      :aria-hidden="activeSlot !== 'b'"
    />

    <div
      v-if="statusLabel"
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { loadYoutubeIframeApi } from '@/composables/useYoutubeIframeApi';
import {
  YT_PLAYER_STATE,
  type YoutubePlayerInstance,
  type YoutubePlayerTrack,
} from '@/shared/youtube.types';

/** Segundos antes del final para hacer el swap al player precargado. */
const SWAP_SECONDS = 3;
/** Segundos antes del swap para iniciar reproducción silenciosa (pre-calentamiento). */
const PREWARM_SECONDS = SWAP_SECONDS + 2;
const TICK_MS = 250;

const props = defineProps<{
  currentTrack: YoutubePlayerTrack | null;
  nextTrack: YoutubePlayerTrack | null;
}>();

const emit = defineEmits<{
  ended: [track: YoutubePlayerTrack];
  error: [track: YoutubePlayerTrack, code: number];
  'need-sync': [];
  /** Emite la canción que ya se ve/oye en pantalla (antes de que el backend confirme). */
  playing: [track: YoutubePlayerTrack];
}>();

type Slot = 'a' | 'b';

const activeSlot = ref<Slot>('a');
const playerA = ref<YoutubePlayerInstance | null>(null);
const playerB = ref<YoutubePlayerInstance | null>(null);
const ready = ref({ a: false, b: false });
const cuedIds = ref({ a: '', b: '' });
const playerState = ref<number | null>(null);
const autoplayBlocked = ref(false);
const swapping = ref(false);
/** Evita doble swap/sync para la misma canción. */
const swappedTrackId = ref<string | null>(null);
/** ID de YouTube que ya está sonando en mute en el player inactivo. */
const prewarmedYoutubeId = ref<string | null>(null);

let tickTimer: ReturnType<typeof setInterval> | null = null;
let destroyed = false;

const statusLabel = computed(() => {
  if (playerState.value === YT_PLAYER_STATE.BUFFERING) return 'Buffering…';
  if (playerState.value === YT_PLAYER_STATE.PLAYING) return '▶ Reproduciendo';
  if (playerState.value === YT_PLAYER_STATE.CUED) return 'Precargado';
  if (playerState.value === YT_PLAYER_STATE.PAUSED) return 'Pausado';
  return '';
});

function slotPlayer(slot: Slot): YoutubePlayerInstance | null {
  return slot === 'a' ? playerA.value : playerB.value;
}

function refreshVisiblePlayer(slot: Slot) {
  const player = slotPlayer(slot);
  if (!player) return;
  try {
    player.setSize?.(640, 360);
    const iframe = player.getIframe?.();
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
    }
  } catch {
    /* ignore */
  }
}

function syncPlayerStateFromSlot(slot: Slot) {
  const player = slotPlayer(slot);
  if (!player) return;
  try {
    playerState.value = player.getPlayerState();
  } catch {
    /* ignore */
  }
}

function baseVars() {
  return {
    autoplay: 0,
    controls: 1,
    rel: 0,
    modestbranding: 1,
    playsinline: 1,
    fs: 0,
    origin: window.location.origin,
  };
}

function inactiveSlot(): Slot {
  return activeSlot.value === 'a' ? 'b' : 'a';
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
      if (slot !== activeSlot.value) return;
      playerState.value = event.data;
      if (event.data === YT_PLAYER_STATE.ENDED && !swapping.value) {
        void handleEndedFallback();
      }
      if (event.data === YT_PLAYER_STATE.PLAYING) {
        autoplayBlocked.value = false;
        refreshVisiblePlayer(slot);
      }
    },
    onError: () => {
      const track = props.currentTrack;
      if (track && slot === activeSlot.value) {
        emit('error', track, -1);
        void skipToNext(true);
      }
    },
  });

  playerA.value = new window.YT.Player('yt-player-a', {
    playerVars: baseVars(),
    events: makeHandlers('a'),
  });

  playerB.value = new window.YT.Player('yt-player-b', {
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
  prewarmedYoutubeId.value = null;
  startTrack(props.currentTrack);
  preloadNext(props.nextTrack);
  startTick();
}

function ensureCued(slot: Slot, track: YoutubePlayerTrack) {
  if (cuedIds.value[slot] === track.youtubeId) return;
  const player = slotPlayer(slot);
  if (!player) return;
  try {
    player.cueVideoById(track.youtubeId, 0);
    cuedIds.value[slot] = track.youtubeId;
  } catch {
    /* ignore */
  }
}

function startTrack(track: YoutubePlayerTrack) {
  const player = slotPlayer(activeSlot.value);
  if (!player) return;
  try {
    player.unMute();
    player.loadVideoById(track.youtubeId, 0);
    cuedIds.value[activeSlot.value] = track.youtubeId;
    prewarmedYoutubeId.value = null;
    emit('playing', track);
    void nextTick().then(() => refreshVisiblePlayer(activeSlot.value));
  } catch {
    /* ignore */
  }
}

/** Player invisible: siempre tiene la siguiente canción en cola con cueVideoById. */
function preloadNext(track: YoutubePlayerTrack | null) {
  if (!track || !bothReady()) return;
  ensureCued(inactiveSlot(), track);
}

/** Inicia reproducción silenciosa en el player oculto para que esté listo al hacer swap. */
function prewarmNext(track: YoutubePlayerTrack) {
  if (!bothReady() || swapping.value) return;
  if (prewarmedYoutubeId.value === track.youtubeId) return;

  const slot = inactiveSlot();
  const player = slotPlayer(slot);
  if (!player) return;

  ensureCued(slot, track);

  const state = player.getPlayerState();
  if (state === YT_PLAYER_STATE.PLAYING || state === YT_PLAYER_STATE.BUFFERING) {
    prewarmedYoutubeId.value = track.youtubeId;
    return;
  }

  try {
    player.mute();
    player.playVideo();
    prewarmedYoutubeId.value = track.youtubeId;
  } catch {
    /* ignore */
  }
}

/** Swap anticipado: a ~3 s del final pasa al player que ya precargó/pre-calentó la siguiente. */
async function performEarlySwap() {
  if (!props.currentTrack || !props.nextTrack || swapping.value) return;
  if (swappedTrackId.value === props.currentTrack.id) return;

  const finished = props.currentTrack;
  const next = props.nextTrack;
  const nextSlot = inactiveSlot();
  const nextPlayer = slotPlayer(nextSlot);
  const currentPlayer = slotPlayer(activeSlot.value);

  if (!nextPlayer) return;

  swapping.value = true;
  swappedTrackId.value = finished.id;

  ensureCued(nextSlot, next);

  const prewarmed = prewarmedYoutubeId.value === next.youtubeId;
  try {
    if (prewarmed) {
      nextPlayer.unMute();
      const state = nextPlayer.getPlayerState();
      if (state !== YT_PLAYER_STATE.PLAYING && state !== YT_PLAYER_STATE.BUFFERING) {
        nextPlayer.playVideo();
      }
    } else {
      nextPlayer.unMute();
      nextPlayer.playVideo();
    }
  } catch {
    try {
      nextPlayer.unMute();
      nextPlayer.loadVideoById(next.youtubeId, 0);
      cuedIds.value[nextSlot] = next.youtubeId;
    } catch {
      /* ignore */
    }
  }

  activeSlot.value = nextSlot;
  syncPlayerStateFromSlot(nextSlot);
  prewarmedYoutubeId.value = null;

  try {
    currentPlayer?.pauseVideo();
  } catch {
    /* ignore */
  }

  emit('playing', next);
  emit('ended', finished);
  emit('need-sync');

  swapping.value = false;

  await nextTick();
  refreshVisiblePlayer(nextSlot);
}

/** Fallback si el swap anticipado no ocurrió (duración desconocida, video corto, etc.). */
async function handleEndedFallback() {
  if (!props.currentTrack || swappedTrackId.value === props.currentTrack.id) return;
  await performEarlySwap();
}

async function skipToNext(fromError = false) {
  if (!props.nextTrack) {
    if (fromError && props.currentTrack) emit('error', props.currentTrack, -1);
    return;
  }
  swappedTrackId.value = null;
  prewarmedYoutubeId.value = null;
  await performEarlySwap();
}

function checkTransitionWindow() {
  if (!bothReady() || swapping.value || !props.currentTrack) return;

  const player = slotPlayer(activeSlot.value);
  if (!player) return;

  const state = player.getPlayerState();
  if (state !== YT_PLAYER_STATE.PLAYING && state !== YT_PLAYER_STATE.BUFFERING) return;

  const duration = player.getDuration();
  const current = player.getCurrentTime();
  if (!duration || duration <= 0) return;

  const remaining = duration - current;
  const next = props.nextTrack;

  // Siempre mantener la siguiente precargada en el player invisible
  if (next) preloadNext(next);

  if (!next || swappedTrackId.value === props.currentTrack.id) return;

  // Pre-calentamiento silencioso un poco antes del swap
  if (remaining <= PREWARM_SECONDS && remaining > SWAP_SECONDS) {
    prewarmNext(next);
  }

  // Swap anticipado a 3 segundos del final
  if (remaining <= SWAP_SECONDS) {
    void performEarlySwap();
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
  slotPlayer(activeSlot.value)?.playVideo();
}

function forceSkip() {
  void skipToNext();
}

defineExpose({ forceSkip, resumePlayback });

watch(
  () => props.currentTrack?.youtubeId,
  (id, prev) => {
    if (!id || !bothReady()) return;
    if (id === prev) return;

    swappedTrackId.value = null;
    prewarmedYoutubeId.value = null;

    const active = slotPlayer(activeSlot.value);
    const playingId = active?.getVideoData?.()?.video_id;
    // Tras swap anticipado el player activo ya reproduce la nueva canción
    if (playingId === id) return;

    startTrack(props.currentTrack!);
    preloadNext(props.nextTrack);
  },
);

watch(
  () => props.nextTrack?.youtubeId,
  (id) => {
    prewarmedYoutubeId.value = null;
    if (id) preloadNext(props.nextTrack);
  },
);

onMounted(() => {
  void initPlayers();
});

onBeforeUnmount(() => {
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
#yt-player-a :deep(iframe),
#yt-player-b :deep(iframe) {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}
</style>
