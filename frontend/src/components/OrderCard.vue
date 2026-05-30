<template>
  <div class="card p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-200">Pedido #{{ order.id.slice(-5) }}</p>
        <p class="text-xs text-slate-500">Mesa {{ displayTable }} · hace {{ minutes }} min</p>
      </div>
      <span class="badge" :class="statusClass">{{ statusLabel }}</span>
    </div>

    <ul class="mt-3 space-y-1.5">
      <li v-for="(it, idx) in order.items" :key="idx" class="flex justify-between text-sm">
        <span class="text-slate-300">
          <span class="font-semibold text-neon-cyan">{{ it.quantity }}×</span> {{ it.name }}
          <span v-if="it.notes" class="block text-xs text-amber-300/80">“{{ it.notes }}”</span>
        </span>
        <span class="text-slate-500">{{ formatMoney(it.subtotal) }}</span>
      </li>
    </ul>

    <div class="mt-3 flex items-center justify-between border-t border-ink-700 pt-3">
      <span class="text-sm font-bold">{{ formatMoney(order.total) }}</span>
      <div class="flex gap-2">
        <button
          v-if="nextStatus"
          class="btn-primary px-3 py-1.5 text-xs"
          @click="$emit('advance', order, nextStatus)"
        >
          {{ nextLabel }}
        </button>
        <button
          v-if="canCancel"
          class="btn-ghost px-3 py-1.5 text-xs"
          @click="$emit('advance', order, 'cancelled')"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Order, OrderStatus } from '@/shared/types';
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
  NEXT_STATUS,
  elapsedMinutes,
} from '@/shared/order-status';
import { formatMoney } from '@/shared/format';

const props = defineProps<{ order: Order; tableLabel?: string }>();
defineEmits<{ advance: [order: Order, status: OrderStatus] }>();

const statusClass = computed(() => ORDER_STATUS_CLASS[props.order.status]);
const statusLabel = computed(() => ORDER_STATUS_LABEL[props.order.status]);
const minutes = computed(() => elapsedMinutes(props.order.createdAt));
const nextStatus = computed(() => NEXT_STATUS[props.order.status]);
const nextLabel = computed(() => (nextStatus.value ? ORDER_STATUS_LABEL[nextStatus.value] : ''));
const canCancel = computed(() => ['pending', 'accepted', 'preparing'].includes(props.order.status));
const displayTable = computed(() => props.tableLabel ?? props.order.tableId.slice(-4));
</script>
