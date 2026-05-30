<template>
  <div class="min-h-screen p-5">
    <header class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-extrabold text-neon-cyan">🍸 Barra</h1>
      <div class="flex items-center gap-3">
        <span class="badge bg-emerald-500/15 text-emerald-300">● en vivo</span>
        <span class="text-sm text-slate-400">{{ orders.bar.length }} comandas</span>
      </div>
    </header>

    <div v-if="orders.bar.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <div v-for="o in sorted" :key="o.id" class="card p-4" :class="urgencyClass(o.createdAt)">
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold">{{ formatTableLabel(o) }}</span>
          <span class="badge" :class="ORDER_STATUS_CLASS[o.status]">{{
            ORDER_STATUS_LABEL[o.status]
          }}</span>
        </div>
        <p class="text-xs text-slate-500">⏱ {{ elapsedMinutes(o.createdAt) }} min</p>
        <ul class="mt-3 space-y-2">
          <OrderItemLine v-for="(it, i) in o.items" :key="i" :item="it" />
        </ul>
        <div class="mt-4 flex gap-2">
          <button
            v-if="next(o.status)"
            class="btn-cyan flex-1 py-2 text-sm"
            @click="advance(o.id, next(o.status)!)"
          >
            {{ ORDER_STATUS_LABEL[next(o.status)!] }}
          </button>
        </div>
      </div>
    </div>
    <p v-else class="mt-20 text-center text-slate-500">Sin bebidas pendientes 🎉</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useOrdersStore } from '@/stores/orders.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  NEXT_STATUS,
  elapsedMinutes,
} from '@/shared/order-status';
import { filterOrderForArea } from '@/shared/order-area';
import { formatTableLabel } from '@/shared/table-label';
import type { OrderStatus } from '@/shared/types';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import OrderItemLine from '@/components/OrderItemLine.vue';

const orders = useOrdersStore();
const auth = useAuthStore();
const toast = useToast();

const sorted = computed(() =>
  orders.bar
    .map((o) => filterOrderForArea(o, 'BAR'))
    .filter((o) => o !== null)
    .sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    ),
);

function next(status: OrderStatus) {
  return NEXT_STATUS[status];
}

function urgencyClass(iso?: string) {
  const min = elapsedMinutes(iso);
  if (min >= 10) return 'ring-2 ring-red-500/60';
  if (min >= 5) return 'ring-2 ring-amber-500/50';
  return '';
}

async function advance(id: string, status: OrderStatus) {
  await orders.updateStatus(id, status).catch((e) => toast.error(apiErrorMessage(e)));
}

onMounted(async () => {
  if (auth.user?.businessId) orders.bindBar(auth.user.businessId);
  await orders.fetchBar().catch((e) => toast.error(apiErrorMessage(e)));
});
</script>
