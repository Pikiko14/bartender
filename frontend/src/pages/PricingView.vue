<template>
  <div class="mx-auto max-w-6xl px-6 py-16">
    <RouterLink to="/" class="text-sm text-neon-cyan">← Inicio</RouterLink>
    <h1 class="mt-4 text-4xl font-extrabold">Planes Bartender</h1>
    <p class="mt-2 text-slate-400">Elige el plan que encaje con tu local. Sin sorpresas.</p>

    <div class="mt-6 flex gap-2">
      <button
        class="badge cursor-pointer px-4 py-2"
        :class="cycle === 'monthly' ? 'bg-neon-pink text-white' : 'bg-ink-700'"
        @click="cycle = 'monthly'"
      >
        Mensual
      </button>
      <button
        class="badge cursor-pointer px-4 py-2"
        :class="cycle === 'yearly' ? 'bg-neon-pink text-white' : 'bg-ink-700'"
        @click="cycle = 'yearly'"
      >
        Anual
      </button>
    </div>

    <div v-if="loading" class="mt-12 text-center text-slate-500">Cargando planes…</div>
    <div v-else class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="card flex flex-col p-6"
        :class="plan.highlighted ? 'ring-2 ring-neon-pink' : ''"
      >
        <h2 class="text-xl font-bold">{{ plan.name }}</h2>
        <p class="mt-2 flex-1 text-sm text-slate-400">{{ plan.description }}</p>
        <p class="mt-4 text-3xl font-extrabold text-neon-cyan">
          {{ price(plan) }}
        </p>
        <ul class="mt-4 space-y-2 text-sm text-slate-300">
          <li v-for="f in plan.featureLabels" :key="f.key">✓ {{ f.label }}</li>
        </ul>
        <RouterLink to="/register" class="btn-primary mt-6 w-full text-center text-sm">
          Empezar
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { plansApi } from '@/services/api';
import { formatMoney } from '@/shared/format';
import type { Plan } from '@/shared/types';

const plans = ref<Plan[]>([]);
const loading = ref(true);
const cycle = ref<'monthly' | 'yearly'>('monthly');

function price(plan: Plan) {
  const n = cycle.value === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  if (plan.slug === 'trial') return '14 días gratis';
  return n === 0 ? 'Gratis' : `${formatMoney(n)}/${cycle.value === 'monthly' ? 'mes' : 'año'}`;
}

onMounted(async () => {
  plans.value = await plansApi.publicList();
  loading.value = false;
});
</script>
