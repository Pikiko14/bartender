import { OrderStatus, PreparationArea } from '@shared/enums';
import { Order } from '../../domain/entities/order.entity';

export interface OrderItemView {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  preparationArea: PreparationArea;
  notes: string | null;
  image: string | null;
  subtotal: number;
}

export interface OrderView {
  id: string;
  businessId: string;
  tableId: string;
  /** Número de mesa (p. ej. 3). */
  tableNumber?: number;
  /** Nombre legible (p. ej. "Mesa 3"). */
  tableName?: string;
  sessionId: string;
  tableSessionId: string;
  items: OrderItemView[];
  total: number;
  areas: PreparationArea[];
  status: OrderStatus;
  notes: string | null;
  createdAt?: Date;
}

export function presentOrder(order: Order): OrderView {
  return {
    id: order.id,
    businessId: order.businessId,
    tableId: order.tableId,
    sessionId: order.sessionId,
    tableSessionId: order.tableSessionId,
    items: order.items.map((i) => ({ ...i.toPrimitives(), subtotal: i.subtotal })),
    total: order.total,
    areas: order.areas,
    status: order.status,
    notes: order.notes,
    createdAt: order.createdAt,
  };
}

/** Vista filtrada para un área concreta (KDS / Bar): solo sus líneas. */
export function presentOrderForArea(order: Order, area: PreparationArea): OrderView {
  const items = order.items
    .filter((i) => i.preparationArea === area)
    .map((i) => ({ ...i.toPrimitives(), subtotal: i.subtotal }));
  const total = Math.round(items.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
  return {
    id: order.id,
    businessId: order.businessId,
    tableId: order.tableId,
    sessionId: order.sessionId,
    tableSessionId: order.tableSessionId,
    items,
    total,
    areas: items.length ? [area] : [],
    status: order.status,
    notes: order.notes,
    createdAt: order.createdAt,
  };
}

export function attachTableInfo(
  view: OrderView,
  table?: { number: number; name: string } | null,
): OrderView {
  if (!table) return view;
  return { ...view, tableNumber: table.number, tableName: table.name };
}
