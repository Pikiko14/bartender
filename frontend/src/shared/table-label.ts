import type { Order } from '@/shared/types';

/** Etiqueta legible de mesa para KDS, barra y admin. */
export function formatTableLabel(
  order: Pick<Order, 'tableId' | 'tableNumber' | 'tableName'>,
): string {
  if (order.tableName?.trim()) return order.tableName.trim();
  if (order.tableNumber != null) return `Mesa ${order.tableNumber}`;
  return `Mesa ${order.tableId.slice(-4)}`;
}
