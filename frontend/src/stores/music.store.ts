import { defineStore } from 'pinia';
import { musicApi, publicApi } from '@/services/api';
import { realtime, SocketEvents, type PlaybackSyncPayload } from '@/socket/socket';
import { dispatchPlaybackSync } from '@/shared/playback-sync';
import { broadcastNowPlaying } from '@/shared/music-sync-bus';
import type { MusicQueue, MusicRequest } from '@/shared/types';

let playbackRelayReady = false;

function ensurePlaybackRelay() {
  if (playbackRelayReady) return;
  playbackRelayReady = true;
  realtime.on<PlaybackSyncPayload>(SocketEvents.MUSIC_PLAYBACK_CONTROL, (cmd) => {
    dispatchPlaybackSync(cmd);
  });
}

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
    async fetchPublicQueue(businessSlug: string) {
      const q = await publicApi.publicQueue(businessSlug);
      this.applyQueue({ ...q, pending: [] });
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
      const playing = await musicApi.playNext();
      this.nowPlaying = playing;
      await this.fetchQueue();
    },
    async skip() {
      const playing = await musicApi.skip();
      this.nowPlaying = playing;
      await this.fetchQueue();
    },
    async playRequest(id: string) {
      const playing = await musicApi.playRequest(id);
      this.nowPlaying = playing;
      await this.fetchQueue();
    },

    sendPlaybackControl(businessId: string, cmd: PlaybackSyncPayload) {
      realtime.emitPlaybackControl(businessId, cmd);
    },

    bindBusiness(businessId: string) {
      ensurePlaybackRelay();
      realtime.joinBusiness(businessId);
      if (this.bound) return;
      this.bound = true;

      realtime.on<MusicRequest>(SocketEvents.MUSIC_REQUESTED, (req) => {
        if (!this.pending.find((p) => p.id === req.id)) this.pending.unshift(req);
      });
      realtime.on<MusicQueue>(SocketEvents.MUSIC_QUEUE_UPDATED, (q) => this.applyQueue(q));
      realtime.on<MusicRequest | null>(SocketEvents.MUSIC_PLAYING, (req) => {
        this.nowPlaying = req;
      });
    },

    notifyPlayback(businessId: string) {
      broadcastNowPlaying(businessId, this.nowPlaying);
    },
  },
});
