<template>
  <div class="min-h-screen bg-ink-950 p-4">
    <header class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-extrabold text-neon-pink">🎧 DJ · Bartender</h1>
      <span class="badge bg-emerald-500/15 text-emerald-300">● dual player</span>
    </header>

    <div v-if="currentTrack" class="mx-auto max-w-5xl">
      <YoutubeDualPlayer
        ref="playerRef"
        :current-track="currentTrack"
        :next-track="nextTrack"
        @need-sync="syncWithBackend"
        @playing="onPlayerPlaying"
        @error="onError"
      />
      <div class="mt-4 flex items-end justify-between gap-4">
        <div>
          <p class="text-xl font-bold">{{ displayTitle }}</p>
          <p v-if="nextTrack" class="text-sm text-slate-400">Siguiente: {{ nextTrack.title }}</p>
        </div>
        <button class="btn-cyan" @click="skip">⏭ Saltar</button>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <p>Sin reproducción activa</p>
      <button class="btn-primary" @click="start">▶ Iniciar cola</button>
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
import type { MusicRequest } from '@/shared/types';
import type { YoutubePlayerTrack } from '@/shared/youtube.types';

const music = useMusicStore();
const auth = useAuthStore();
const toast = useToast();
const playerRef = ref<InstanceType<typeof YoutubeDualPlayer> | null>(null);
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
  await music.playNext().catch((e) => toast.error(apiErrorMessage(e)));
  liveTrack.value = toTrack(music.nowPlaying);
}

function onError() {
  void syncWithBackend();
}

async function skip() {
  playerRef.value?.forceSkip();
  await music.skip().catch((e) => toast.error(apiErrorMessage(e)));
}

async function start() {
  await music.playNext().catch((e) => toast.error(apiErrorMessage(e)));
}

onMounted(async () => {
  if (auth.user?.businessId) music.bindBusiness(auth.user.businessId);
  await music.fetchQueue().catch((e) => toast.error(apiErrorMessage(e)));
  if (!music.nowPlaying && music.queue.length) await start();
});
</script>
