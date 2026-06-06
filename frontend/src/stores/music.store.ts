import { defineStore } from 'pinia';
import { musicApi, publicApi } from '@/services/api';
import { realtime, SocketEvents, type PlaybackSyncPayload } from '@/socket/socket';
import { dispatchPlaybackSync } from '@/shared/playback-sync';
import { broadcastNowPlaying, broadcastQueueState } from '@/shared/music-sync-bus';
import { notifyMusicPlaybackChanged } from '@/shared/music-playback-bus';
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
    businessId: null as string | null,
    bound: false,
  }),
  actions: {
    async fetchQueue() {
      const q = await musicApi.queue();
      this.applyQueue(q);
      return q;
    },
    async fetchPublicQueue(businessSlug: string) {
      const q = await publicApi.publicQueue(businessSlug);
      this.applyQueue({ ...q, pending: [] });
      return q;
    },
    applyQueue(q: MusicQueue) {
      this.nowPlaying = q.nowPlaying;
      this.queue = q.queue;
      this.pending = q.pending ?? [];
      notifyMusicPlaybackChanged();
    },
    broadcastIfBound() {
      if (this.businessId) this.broadcastState(this.businessId);
    },
    async approve(id: string) {
      const q = await musicApi.approve(id);
      this.applyQueue(q);
      this.broadcastIfBound();
      return q;
    },
    async enqueue(body: {
      title: string;
      youtubeId?: string;
      spotifyId?: string;
      thumbnail?: string;
      channelTitle?: string;
      artist?: string;
      album?: string;
      durationSeconds?: number;
    }) {
      const q = await musicApi.enqueue(body);
      this.applyQueue(q);
      this.broadcastIfBound();
      return q;
    },
    async enqueuePlaylist(playlistId: string, playNow = false) {
      const result = await musicApi.enqueuePlaylist({ playlistId, playNow });
      this.applyQueue(result.queue);
      this.broadcastIfBound();
      if (playNow) notifyMusicPlaybackChanged();
      return result;
    },
    async reject(id: string) {
      const q = await musicApi.reject(id);
      this.applyQueue(q);
      this.broadcastIfBound();
      return q;
    },
    async removeFromQueue(id: string) {
      const q = await musicApi.removeFromQueue(id);
      this.applyQueue(q);
      this.broadcastIfBound();
      notifyMusicPlaybackChanged();
      return q;
    },
    async playNext() {
      try {
        const playing = await musicApi.playNext();
        await this.fetchQueue();
        if (playing) this.nowPlaying = playing;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
        return playing;
      } catch (e) {
        await this.fetchQueue();
        throw e;
      }
    },
    async skip() {
      try {
        const playing = await musicApi.skip();
        await this.fetchQueue();
        if (playing) this.nowPlaying = playing;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
        return playing;
      } catch (e) {
        await this.fetchQueue();
        throw e;
      }
    },

    /** Si Spotify reproduce una pista de la cola, marca playing en BD. */
    async trySyncFromSpotifyTrack(spotifyId: string) {
      if (!spotifyId) return;
      const candidates = [
        ...this.queue.filter((q) => q.spotifyId === spotifyId),
        ...(this.nowPlaying?.spotifyId === spotifyId ? [this.nowPlaying] : []),
      ];
      const match = candidates.find((c) => c.status === 'approved' || c.status === 'playing');
      if (!match || match.status === 'playing') return;
      await this.syncPlaying(match.id);
      await this.fetchQueue();
    },
    async playRequest(id: string) {
      try {
        const playing = await musicApi.playRequest(id);
        await this.fetchQueue();
        if (playing) this.nowPlaying = playing;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
        return playing;
      } catch (e) {
        await this.fetchQueue();
        throw e;
      }
    },

    async playNextPublic(businessSlug: string) {
      try {
        const playing = await publicApi.publicPlayNext(businessSlug);
        await this.fetchPublicQueue(businessSlug);
        if (playing) this.nowPlaying = playing;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
        return playing;
      } catch (e) {
        await this.fetchPublicQueue(businessSlug).catch(() => undefined);
        throw e;
      }
    },

    async playRequestPublic(businessSlug: string, id: string) {
      const playing = await publicApi.publicPlayRequest(businessSlug, id);
      this.nowPlaying = playing;
      this.broadcastIfBound();
      notifyMusicPlaybackChanged();
    },

    async syncPlaying(id: string) {
      const playing = await musicApi.syncPlaying(id);
      this.nowPlaying = playing;
      this.broadcastIfBound();
      notifyMusicPlaybackChanged();
      return playing;
    },

    async syncPlayingPublic(businessSlug: string, id: string) {
      const playing = await publicApi.publicSyncPlaying(businessSlug, id);
      this.nowPlaying = playing;
      this.broadcastIfBound();
      notifyMusicPlaybackChanged();
      return playing;
    },

    async skipPublic(businessSlug: string) {
      try {
        const playing = await publicApi.publicSkip(businessSlug);
        await this.fetchPublicQueue(businessSlug);
        if (playing) this.nowPlaying = playing;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
        return playing;
      } catch (e) {
        await this.fetchPublicQueue(businessSlug).catch(() => undefined);
        throw e;
      }
    },

    async updatePlaybackSource(
      id: string,
      body: { youtubeId: string; title: string; thumbnail?: string | null; channelTitle?: string | null },
      opts?: { businessSlug?: string; useStaffApi?: boolean },
    ) {
      const updated = opts?.useStaffApi
        ? await musicApi.updatePlaybackSource(id, body)
        : await publicApi.publicUpdatePlaybackSource(opts!.businessSlug!, id, body);
      if (this.nowPlaying?.id === id) this.nowPlaying = updated;
      const idx = this.queue.findIndex((q) => q.id === id);
      if (idx >= 0) this.queue[idx] = updated;
      this.broadcastIfBound();
      return updated;
    },

    /** Marca en backend la pista que suena (status → playing). */
    async syncLiveTrack(
      liveRequestId: string,
      opts: { businessSlug?: string; useStaffApi?: boolean },
    ) {
      const synced =
        this.nowPlaying?.id === liveRequestId && this.nowPlaying?.status === 'playing';
      if (synced) return;

      const { businessSlug, useStaffApi } = opts;

      if (useStaffApi) {
        await this.syncPlaying(liveRequestId);
        return;
      }
      if (businessSlug) {
        await this.syncPlayingPublic(businessSlug, liveRequestId);
      }
    },

    sendPlaybackControl(businessId: string, cmd: PlaybackSyncPayload) {
      realtime.emitPlaybackControl(businessId, cmd);
    },

    /** Propaga el estado de cola a otras pestañas (admin ↔ DJ). */
    broadcastState(businessId: string) {
      const snapshot: MusicQueue = {
        nowPlaying: this.nowPlaying,
        queue: this.queue,
        pending: this.pending,
      };
      broadcastQueueState(businessId, snapshot);
      broadcastNowPlaying(businessId, this.nowPlaying);
    },

    bindBusiness(businessId: string) {
      this.businessId = businessId;
      ensurePlaybackRelay();
      realtime.joinBusiness(businessId);
      if (this.bound) return;
      this.bound = true;

      realtime.on<MusicQueue>(SocketEvents.MUSIC_QUEUE_UPDATED, (q) => {
        this.applyQueue(q);
        this.broadcastIfBound();
      });
      realtime.on<MusicRequest | null>(SocketEvents.MUSIC_PLAYING, (req) => {
        this.nowPlaying = req;
        this.broadcastIfBound();
        notifyMusicPlaybackChanged();
      });
      realtime.on(SocketEvents.MUSIC_REQUESTED, () => {
        void this.fetchQueue();
      });
      realtime.on(SocketEvents.MUSIC_APPROVED, () => {
        void this.fetchQueue();
      });
    },

    notifyPlayback(businessId: string) {
      this.broadcastState(businessId);
      notifyMusicPlaybackChanged();
    },
  },
});
