import { defineStore } from 'pinia';
import { ordersApi } from '@/services/api';
import { realtime, SocketEvents } from '@/socket/socket';
import type { Order, OrderStatus } from '@/shared/types';

function upsert(list: Order[], order: Order): Order[] {
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = order;
    return copy;
  }
  return [order, ...list];
}

const ACTIVE: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready'];

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: [] as Order[],
    kitchen: [] as Order[],
    bar: [] as Order[],
    bound: false,
  }),
  actions: {
    async fetchAll() {
      this.orders = await ordersApi.list();
    },
    async fetchKitchen() {
      this.kitchen = await ordersApi.kitchen();
    },
    async fetchBar() {
      this.bar = await ordersApi.bar();
    },
    async updateStatus(id: string, status: OrderStatus) {
      await ordersApi.updateStatus(id, status);
    },

    /** Conecta los listeners realtime para un negocio (dashboard admin). */
    bindBusiness(businessId: string) {
      if (this.bound) return;
      this.bound = true;
      realtime.joinBusiness(businessId);

      realtime.on<Order>(SocketEvents.ORDER_CREATED, (order) => {
        this.orders = upsert(this.orders, order);
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.orders = upsert(this.orders, order);
        this.kitchen = this.applyActiveFilter(upsert(this.kitchen, order));
        this.bar = this.applyActiveFilter(upsert(this.bar, order));
      });
    },

    bindKitchen(businessId: string) {
      realtime.joinKitchen(businessId);
      realtime.on<Order>(SocketEvents.KITCHEN_ORDER_CREATED, (order) => {
        this.kitchen = upsert(this.kitchen, order);
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.kitchen = this.applyActiveFilter(upsert(this.kitchen, order));
      });
    },

    bindBar(businessId: string) {
      realtime.joinBar(businessId);
      realtime.on<Order>(SocketEvents.BAR_ORDER_CREATED, (order) => {
        this.bar = upsert(this.bar, order);
      });
      realtime.on<Order>(SocketEvents.ORDER_UPDATED, (order) => {
        this.bar = this.applyActiveFilter(upsert(this.bar, order));
      });
    },

    applyActiveFilter(list: Order[]): Order[] {
      return list.filter((o) => ACTIVE.includes(o.status));
    },
  },
});
