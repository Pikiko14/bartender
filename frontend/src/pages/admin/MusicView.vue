<template>
  <div>
    <h1 class="text-2xl font-bold">Música</h1>
    <p class="text-sm text-slate-400">Modera peticiones · reproductor dual sin cortes.</p>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Reproduciendo ahora</h2>
          <a href="/dj" target="_blank" class="text-xs text-neon-cyan hover:underline">↗ Pantalla DJ</a>
        </div>

        <div v-if="currentTrack" class="mt-4">
          <YoutubeDualPlayer
            ref="playerRef"
            :current-track="currentTrack"
            :next-track="nextTrack"
            @need-sync="syncWithBackend"
            @playing="onPlayerPlaying"
            @error="onTrackError"
          />
          <p class="mt-3 font-semibold">{{ displayTitle }}</p>
          <p v-if="nextTrack" class="mt-1 text-xs text-slate-500">
            Siguiente: {{ nextTrack.title }}
          </p>
          <div class="mt-4 flex gap-2">
            <button class="btn-cyan text-sm" @click="skip">⏭ Saltar</button>
            <button class="btn-ghost text-sm" @click="playNext">▶ Siguiente (API)</button>
          </div>
        </div>
        <div v-else class="mt-4 flex flex-col items-center gap-3 py-10 text-center text-slate-500">
          <p>No hay nada sonando.</p>
          <button class="btn-primary text-sm" @click="playNext">▶ Reproducir cola</button>
        </div>

        <h3 class="mt-8 font-semibold">Cola aprobada ({{ music.queue.length }})</h3>
        <ul class="mt-3 space-y-2">
          <li
            v-for="(s, i) in music.queue"
            :key="s.id"
            class="flex items-center gap-3 rounded-lg bg-ink-800 p-2"
            :class="i === 0 ? 'ring-1 ring-neon-cyan/40' : ''"
          >
            <img :src="s.thumbnail ?? ''" class="h-10 w-16 rounded object-cover" alt="" />
            <span class="flex-1 truncate text-sm">{{ s.title }}</span>
            <span v-if="i === 0" class="badge bg-neon-cyan/20 text-neon-cyan">Siguiente</span>
            <span class="badge bg-ink-700 text-slate-400">▲ {{ s.votes }}</span>
          </li>
          <li v-if="!music.queue.length" class="text-sm text-slate-500">Cola vacía.</li>
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
import { computed, onMounted, ref } from 'vue';
import YoutubeDualPlayer from '@/components/YoutubeDualPlayer.vue';
import { useMusicStore } from '@/stores/music.store';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { YoutubePlayerTrack } from '@/shared/youtube.types';
import type { MusicRequest } from '@/shared/types';

const music = useMusicStore();
const auth = useAuthStore();
const toast = useToast();
const playerRef = ref<InstanceType<typeof YoutubeDualPlayer> | null>(null);
const syncing = ref(false);
const liveTrack = ref<YoutubePlayerTrack | null>(null);

function toTrack(req: MusicRequest | null): YoutubePlayerTrack | null {
  if (!req) return null;
  return { id: req.id, youtubeId: req.youtubeId, title: req.title };
}

const currentTrack = computed(() => toTrack(music.nowPlaying));
const nextTrack = computed(() => toTrack(music.queue[0] ?? null));
const displayTitle = computed(
  () => liveTrack.value?.title ?? music.nowPlaying?.title ?? '',
);

function onPlayerPlaying(track: YoutubePlayerTrack) {
  liveTrack.value = track;
}

async function syncWithBackend() {
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

function onTrackError(_track: YoutubePlayerTrack, code: number) {
  toast.error(`Error en video (${code}). Saltando…`);
  void syncWithBackend();
}

async function skip() {
  try {
    playerRef.value?.forceSkip();
    await music.skip();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

async function playNext() {
  try {
    await music.playNext();
  } catch (e) {
    toast.error(apiErrorMessage(e));
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
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  await music.fetchQueue().catch((e) => toast.error(apiErrorMessage(e)));
  if (!music.nowPlaying && music.queue.length) {
    await playNext();
  }
});
</script>
