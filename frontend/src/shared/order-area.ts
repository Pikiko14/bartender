import type { Order, PreparationArea } from '@/shared/types';

/** Solo líneas del área indicada (KDS / barra). */
export function filterOrderForArea(order: Order, area: PreparationArea): Order | null {
  const items = order.items.filter((i) => i.preparationArea === area);
  if (!items.length) return null;
  const total = Math.round(items.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
  return { ...order, items, total, areas: [area] };
}

export function filterOrdersForArea(orders: Order[], area: PreparationArea): Order[] {
  return orders
    .map((o) => filterOrderForArea(o, area))
    .filter((o): o is Order => o !== null);
}
