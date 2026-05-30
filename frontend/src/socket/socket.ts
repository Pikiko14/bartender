import { io, type Socket } from 'socket.io-client';

// En desarrollo se usa VITE_SOCKET_URL (p.ej. http://localhost:3000).
// En producción (detrás de nginx) se deja vacío y se conecta al mismo origen.
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
  TABLE_UPDATED: 'table.updated',
} as const;

class RealtimeClient {
  private socket: Socket | null = null;
  private readonly joinedRooms = new Set<string>();

  connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Reune las rooms tras una reconexión automática.
    this.socket.on('connect', () => {
      for (const room of this.joinedRooms) {
        const [type, id] = room.split('|');
        this.socket?.emit(`join:${type}`, id);
      }
    });

    return this.socket;
  }

  private join(type: 'business' | 'kitchen' | 'bar' | 'table', id: string): void {
    const socket = this.connect();
    this.joinedRooms.add(`${type}|${id}`);
    socket.emit(`join:${type}`, id);
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
