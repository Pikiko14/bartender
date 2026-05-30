import { OrderStatus, PreparationArea } from '@shared/enums';
import { Order } from '../../domain/entities/order.entity';

export interface OrderItemView {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  preparationArea: PreparationArea;
  notes: string | null;
  subtotal: number;
}

export interface OrderView {
  id: string;
  businessId: string;
  tableId: string;
  sessionId: string;
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
  const view = presentOrder(order);
  return { ...view, items: view.items.filter((i) => i.preparationArea === area) };
}
