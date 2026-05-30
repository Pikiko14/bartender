/** Catálogo central de eventos realtime emitidos por el backend. */
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

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

/** Helpers para nombres de rooms consistentes en todo el sistema. */
export const SocketRooms = {
  business: (businessId: string) => `business:${businessId}`,
  kitchen: (businessId: string) => `kitchen:${businessId}`,
  bar: (businessId: string) => `bar:${businessId}`,
  table: (tableId: string) => `table:${tableId}`,
};
