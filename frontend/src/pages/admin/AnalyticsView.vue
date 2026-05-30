<template>
  <div>
    <h1 class="text-2xl font-bold">Analytics</h1>
    <p class="text-sm text-slate-400">Últimos 30 días.</p>

    <div v-if="data" class="mt-6 space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card p-5">
          <p class="text-xs uppercase text-slate-500">Ingresos</p>
          <p class="mt-2 text-3xl font-extrabold text-neon-cyan">
            {{ formatMoney(data.sales.revenue) }}
          </p>
        </div>
        <div class="card p-5">
          <p class="text-xs uppercase text-slate-500">Pedidos</p>
          <p class="mt-2 text-3xl font-extrabold text-neon-pink">{{ data.sales.orders }}</p>
        </div>
        <div class="card p-5">
          <p class="text-xs uppercase text-slate-500">Ticket medio</p>
          <p class="mt-2 text-3xl font-extrabold">{{ formatMoney(data.sales.averageTicket) }}</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <h2 class="font-semibold">Productos más vendidos</h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li v-for="p in data.topProducts" :key="p.name" class="flex justify-between">
              <span>{{ p.name }}</span>
              <span class="text-slate-400"
                >{{ p.quantity }} uds · {{ formatMoney(p.revenue) }}</span
              >
            </li>
            <li v-if="!data.topProducts.length" class="text-slate-500">Sin datos.</li>
          </ul>
        </div>
        <div class="card p-5">
          <h2 class="font-semibold">Canciones más pedidas</h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li v-for="s in data.topSongs" :key="s.youtubeId" class="flex justify-between">
              <span class="truncate">{{ s.title }}</span>
              <span class="text-slate-400">{{ s.requests }}×</span>
            </li>
            <li v-if="!data.topSongs.length" class="text-slate-500">Sin datos.</li>
          </ul>
        </div>
        <div class="card p-5">
          <h2 class="font-semibold">Horas pico</h2>
          <div class="mt-4 flex items-end gap-1" style="height: 120px">
            <div
              v-for="h in data.peakHours"
              :key="h.hour"
              class="flex-1 rounded-t bg-neon-purple/70"
              :style="{ height: `${barHeight(h.orders)}%` }"
              :title="`${h.hour}:00 · ${h.orders} pedidos`"
            />
          </div>
        </div>
        <div class="card p-5">
          <h2 class="font-semibold">Tiempo medio de preparación</h2>
          <p class="mt-4 text-4xl font-extrabold text-neon-amber">
            {{ data.avgPreparationMinutes }} min
          </p>
        </div>
      </div>
    </div>
    <p v-else class="mt-6 text-sm text-slate-500">Cargando…</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { analyticsApi } from '@/services/api';
import { formatMoney } from '@/shared/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { AnalyticsOverview } from '@/shared/types';

const toast = useToast();
const data = ref<AnalyticsOverview | null>(null);

const maxOrders = computed(() =>
  Math.max(1, ...(data.value?.peakHours.map((h) => h.orders) ?? [1])),
);
function barHeight(orders: number) {
  return Math.round((orders / maxOrders.value) * 100);
}

onMounted(async () => {
  try {
    data.value = await analyticsApi.overview();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
});
</script>
