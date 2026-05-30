<template>
  <div>
    <h1 class="text-2xl font-bold">Dashboard</h1>
    <p class="text-sm text-slate-400">Operativa en tiempo real de tu negocio.</p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="card p-5">
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ kpi.label }}</p>
        <p class="mt-2 text-3xl font-extrabold" :class="kpi.color">{{ kpi.value }}</p>
      </div>
    </div>

    <div class="mt-8">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Pedidos activos</h2>
        <span class="badge bg-emerald-500/15 text-emerald-300">● en vivo</span>
      </div>
      <div v-if="activeOrders.length" class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OrderCard
          v-for="order in activeOrders"
          :key="order.id"
          :order="order"
          @advance="advance"
        />
      </div>
      <p v-else class="mt-4 text-sm text-slate-500">No hay pedidos activos ahora mismo.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import OrderCard from '@/components/OrderCard.vue';
import { useOrdersStore } from '@/stores/orders.store';
import { useAuthStore } from '@/stores/auth.store';
import { formatMoney } from '@/shared/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { Order, OrderStatus } from '@/shared/types';

const orders = useOrdersStore();
const auth = useAuthStore();
const toast = useToast();

const activeOrders = computed(() =>
  orders.orders.filter((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)),
);

const todayRevenue = computed(() =>
  orders.orders.filter((o) => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0),
);

const kpis = computed(() => [
  { label: 'Pedidos activos', value: activeOrders.value.length, color: 'text-neon-pink' },
  { label: 'Pendientes', value: countByStatus('pending'), color: 'text-amber-300' },
  { label: 'Listos', value: countByStatus('ready'), color: 'text-emerald-300' },
  { label: 'Ingresos sesión', value: formatMoney(todayRevenue.value), color: 'text-neon-cyan' },
]);

function countByStatus(status: OrderStatus) {
  return orders.orders.filter((o) => o.status === status).length;
}

async function advance(order: Order, status: OrderStatus) {
  try {
    await orders.updateStatus(order.id, status);
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

onMounted(async () => {
  if (auth.user?.businessId) orders.bindBusiness(auth.user.businessId);
  await orders.fetchAll().catch((e) => toast.error(apiErrorMessage(e)));
});
</script>
