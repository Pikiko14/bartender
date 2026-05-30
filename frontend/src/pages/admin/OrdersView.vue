<template>
  <div>
    <h1 class="text-2xl font-bold">Pedidos</h1>
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="f in filters"
        :key="f.value ?? 'all'"
        class="badge cursor-pointer px-3 py-1.5"
        :class="active === f.value ? 'bg-neon-pink text-white' : 'bg-ink-700 text-slate-300'"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="filtered.length" class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <OrderCard v-for="order in filtered" :key="order.id" :order="order" @advance="advance" />
    </div>
    <p v-else class="mt-6 text-sm text-slate-500">No hay pedidos para este filtro.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import OrderCard from '@/components/OrderCard.vue';
import { useOrdersStore } from '@/stores/orders.store';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { Order, OrderStatus } from '@/shared/types';

const orders = useOrdersStore();
const auth = useAuthStore();
const toast = useToast();
const active = ref<OrderStatus | undefined>(undefined);

const filters: Array<{ label: string; value?: OrderStatus }> = [
  { label: 'Todos' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Preparando', value: 'preparing' },
  { label: 'Listos', value: 'ready' },
  { label: 'Entregados', value: 'delivered' },
];

const filtered = computed(() =>
  active.value ? orders.orders.filter((o) => o.status === active.value) : orders.orders,
);

function setFilter(value?: OrderStatus) {
  active.value = value;
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
