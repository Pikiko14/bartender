import { defineStore } from 'pinia';
import { ordersApi } from '@/services/api';
import { filterOrderForArea, filterOrdersForArea } from '@/shared/order-area';
import { realtime, SocketEvents } from '@/socket/socket';
import type { Order, OrderStatus, PreparationArea } from '@/shared/types';

function upsert(list: Order[], order: Order): Order[] {
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    const copy = [...list];
    const prev = copy[idx];
    copy[idx] = {
      ...order,
      tableName: order.tableName ?? prev.tableName,
      tableNumber: order.tableNumber ?? prev.tableNumber,
    };
    return copy;
  }
  return [order, ...list];
}

function upsertForArea(list: Order[], order: Order, area: PreparationArea): Order[] {
  const filtered = filterOrderForArea(order, area);
  if (!filtered) return list.filter((o) => o.id !== order.id);
  return upsert(list, filtered);
}

const ACTIVE: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready'];

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: [] as Order[],
    kitchen: [] as Order[],
    bar: [] as Order[],
    businessBound: false,
    kitchenBound: false,
    barBound: false,
  }),
  actions: {
    async fetchAll() {
      this.orders = await ordersApi.list();
    },
    async fetchKitchen() {
      const data = await ordersApi.kitchen();
      this.kitchen = filterOrdersForArea(data, 'KITCHEN');
    },
    async fetchBar() {
      const data = await ordersApi.bar();
      this.bar = filterOrdersForArea(data, 'BAR');
    },
    async updateStatus(id: string, status: OrderStatus) {
      await ordersApi.updateStatus(id, status);
    },

    /** Conecta los listeners realtime para un negocio (dashboard admin). */
    bindBusiness(businessId: string) {
      if (this.businessBound) return;
      this.businessBound = true;
      realtime.joinBusiness(businessId);

      realtime.on<Order>(SocketEvents.ORDER_CREATED, (order) => {
        this.orders = upsert(this.orders, order);
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.orders = upsert(this.orders, order);
        this.kitchen = this.applyActiveFilter(upsertForArea(this.kitchen, order, 'KITCHEN'));
        this.bar = this.applyActiveFilter(upsertForArea(this.bar, order, 'BAR'));
      });
    },

    bindKitchen(businessId: string) {
      if (this.kitchenBound) return;
      this.kitchenBound = true;
      realtime.joinKitchen(businessId);
      realtime.on<Order>(SocketEvents.KITCHEN_ORDER_CREATED, (order) => {
        this.kitchen = upsertForArea(this.kitchen, order, 'KITCHEN');
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.kitchen = this.applyActiveFilter(upsertForArea(this.kitchen, order, 'KITCHEN'));
      });
    },

    bindBar(businessId: string) {
      if (this.barBound) return;
      this.barBound = true;
      realtime.joinBar(businessId);
      realtime.on<Order>(SocketEvents.BAR_ORDER_CREATED, (order) => {
        this.bar = upsertForArea(this.bar, order, 'BAR');
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.bar = this.applyActiveFilter(upsertForArea(this.bar, order, 'BAR'));
      });
    },

    applyActiveFilter(list: Order[]): Order[] {
      return list.filter((o) => ACTIVE.includes(o.status));
    },
  },
});
