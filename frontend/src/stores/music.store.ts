import { defineStore } from 'pinia';
import { musicApi } from '@/services/api';
import { realtime, SocketEvents } from '@/socket/socket';
import type { MusicQueue, MusicRequest } from '@/shared/types';

export const useMusicStore = defineStore('music', {
  state: () => ({
    nowPlaying: null as MusicRequest | null,
    queue: [] as MusicRequest[],
    pending: [] as MusicRequest[],
    bound: false,
  }),
  actions: {
    async fetchQueue() {
      const q = await musicApi.queue();
      this.applyQueue(q);
    },
    applyQueue(q: MusicQueue) {
      this.nowPlaying = q.nowPlaying;
      this.queue = q.queue;
      this.pending = q.pending ?? [];
    },
    async approve(id: string) {
      await musicApi.approve(id);
    },
    async reject(id: string) {
      await musicApi.reject(id);
    },
    async playNext() {
      await musicApi.playNext();
    },
    async skip() {
      await musicApi.skip();
    },

    bindBusiness(businessId: string) {
      if (this.bound) return;
      this.bound = true;
      realtime.joinBusiness(businessId);

      realtime.on<MusicRequest>(SocketEvents.MUSIC_REQUESTED, (req) => {
        if (!this.pending.find((p) => p.id === req.id)) this.pending.unshift(req);
      });
      realtime.on<MusicQueue>(SocketEvents.MUSIC_QUEUE_UPDATED, (q) => this.applyQueue(q));
      realtime.on<MusicRequest | null>(SocketEvents.MUSIC_PLAYING, (req) => {
        this.nowPlaying = req;
      });
    },
  },
});
