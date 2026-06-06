import { io, type Socket } from 'socket.io-client';

// Vacío = mismo origen (Vite proxya /socket.io → backend en dev).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const SocketEvents = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  KITCHEN_ORDER_CREATED: 'kitchen.order.created',
  BAR_ORDER_CREATED: 'bar.order.created',
  MUSIC_REQUESTED: 'music.requested',
  MUSIC_APPROVED: 'music.approved',
  MUSIC_REJECTED: 'music.rejected',
  MUSIC_PLAYING: 'music.playing',
  MUSIC_SKIPPED: 'music.skipped',
  MUSIC_QUEUE_UPDATED: 'music.queue.updated',
  MUSIC_SHARE_SIGNAL: 'music.share.signal',
  MUSIC_SHARE_VIEWER_READY: 'music.share.viewer-ready',
  MUSIC_PLAYBACK_CONTROL: 'music.playback.control',
  TABLE_UPDATED: 'table.updated',
  TABLE_SESSION_CLOSED: 'table.session.closed',
} as const;

export type PlaybackSyncPayload = {
  action: 'play' | 'pause';
  youtubeId: string;
  at?: number;
};

export type DjShareSignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

class RealtimeClient {
  private socket: Socket | null = null;
  private readonly joinedRooms = new Set<string>();

  connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    if (import.meta.env.DEV) {
      this.socket.on('connect_error', (err) => {
        console.warn('[socket] connect_error:', err.message, '→', SOCKET_URL);
      });
    }

    // Reune las rooms tras una reconexión automática.
    this.socket.on('connect', () => {
      for (const room of this.joinedRooms) {
        const [type, id] = room.split('|');
        if (type === 'dj-cast') {
          this.socket?.emit('join:dj-cast', id);
        } else {
          this.socket?.emit(`join:${type}`, id);
        }
      }
    });

    return this.socket;
  }

  private join(type: 'business' | 'kitchen' | 'bar' | 'table' | 'dj-cast', id: string): void {
    const socket = this.connect();
    this.joinedRooms.add(`${type}|${id}`);
    if (type === 'dj-cast') {
      socket.emit('join:dj-cast', id);
    } else {
      socket.emit(`join:${type}`, id);
    }
  }

  joinBusiness(id: string) {
    this.join('business', id);
  }
  joinKitchen(id: string) {
    this.join('kitchen', id);
  }
  joinBar(id: string) {
    this.join('bar', id);
  }
  joinTable(id: string) {
    this.join('table', id);
  }
  joinDjCast(businessId: string) {
    this.join('dj-cast', businessId);
  }

  emitDjShareSignal(businessId: string, data: DjShareSignalPayload) {
    this.connect().emit('music.share.signal', { businessId, data });
  }

  emitShareViewerReady(businessId: string) {
    this.connect().emit('music.share.viewer-ready', businessId);
  }

  emitPlaybackControl(businessId: string, data: PlaybackSyncPayload) {
    this.connect().emit('music.playback.control', { businessId, ...data });
  }

  onDjShareSignal(handler: (data: DjShareSignalPayload) => void): void {
    this.connect().on(SocketEvents.MUSIC_SHARE_SIGNAL, handler as (payload: unknown) => void);
  }

  offDjShareSignal(handler?: (data: DjShareSignalPayload) => void): void {
    this.socket?.off(SocketEvents.MUSIC_SHARE_SIGNAL, handler as (payload: unknown) => void);
  }

  on<T>(event: string, handler: (payload: T) => void): void {
    this.connect().on(event, handler as (payload: unknown) => void);
  }

  off(event: string, handler?: (payload: unknown) => void): void {
    this.socket?.off(event, handler);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.joinedRooms.clear();
  }
}

export const realtime = new RealtimeClient();
