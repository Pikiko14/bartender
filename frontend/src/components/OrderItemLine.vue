<template>
  <li class="flex items-start gap-2.5">
    <MenuImage :src="item.image" :alt="item.name" size="thumb" />
    <div class="min-w-0 flex-1">
      <p class="text-sm text-slate-200">
        <span class="font-bold text-neon-cyan">{{ item.quantity }}×</span> {{ item.name }}
      </p>
      <span v-if="item.notes" class="mt-0.5 block text-xs text-amber-300">“{{ item.notes }}”</span>
      <span v-if="showPrice" class="mt-0.5 block text-xs text-slate-500">{{
        formatMoney(item.subtotal)
      }}</span>
    </div>
  </li>
</template>

<script setup lang="ts">
import MenuImage from '@/components/MenuImage.vue';
import { formatMoney } from '@/shared/format';
import type { OrderItem } from '@/shared/types';

defineProps<{
  item: OrderItem;
  showPrice?: boolean;
}>();
</script>
