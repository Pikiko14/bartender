<template>
  <div>
    <h1 class="text-2xl font-bold">Plan y servicios</h1>
    <p class="text-sm text-slate-400">Gestiona tu suscripción y los servicios incluidos.</p>

    <div v-if="plans.currentPlan" class="card mt-6 p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">Plan actual</p>
          <h2 class="mt-1 text-2xl font-extrabold text-neon-cyan">{{ plans.currentPlan.name }}</h2>
          <p class="mt-1 text-sm text-slate-400">{{ plans.currentPlan.description }}</p>
          <p v-if="plans.subscription" class="mt-2 text-xs text-slate-500">
            Estado: {{ plans.subscription.status }} · Renueva:
            {{ formatDate(plans.subscription.currentPeriodEnd) }}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            class="badge cursor-pointer px-3 py-1.5"
            :class="plans.billingCycle === 'monthly' ? 'bg-neon-pink text-white' : 'bg-ink-700'"
            @click="plans.setBillingCycle('monthly')"
          >
            Mensual
          </button>
          <button
            class="badge cursor-pointer px-3 py-1.5"
            :class="plans.billingCycle === 'yearly' ? 'bg-neon-pink text-white' : 'bg-ink-700'"
            @click="plans.setBillingCycle('yearly')"
          >
            Anual (-17%)
          </button>
        </div>
      </div>

      <h3 class="mt-6 font-semibold">Servicios incluidos</h3>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        <li
          v-for="f in plans.currentPlan.featureLabels"
          :key="f.key"
          class="flex items-center gap-2 text-sm text-slate-300"
        >
          <span class="text-emerald-400">✓</span> {{ f.label }}
        </li>
      </ul>
    </div>

    <h2 class="mt-10 text-lg font-bold">Cambiar de plan</h2>
    <div class="mx-auto mt-4 grid max-w-3xl gap-4 md:grid-cols-2">
      <div
        v-for="plan in availablePlans"
        :key="plan.id"
        class="card flex flex-col p-5"
        :class="plan.highlighted ? 'ring-2 ring-neon-pink shadow-neon' : ''"
      >
        <span v-if="plan.highlighted" class="badge mb-2 w-fit bg-neon-pink/20 text-neon-pink">
          Popular
        </span>
        <h3 class="text-xl font-bold">{{ plan.name }}</h3>
        <p class="mt-1 flex-1 text-sm text-slate-400">{{ plan.description }}</p>
        <p class="mt-4 text-3xl font-extrabold">
          {{ formatPrice(plan) }}
          <span class="text-sm font-normal text-slate-500">/ {{ plans.billingCycle === 'monthly' ? 'mes' : 'año' }}</span>
        </p>
        <ul class="mt-4 space-y-1.5 text-xs text-slate-400">
          <li v-for="f in plan.featureLabels.slice(0, 6)" :key="f.key">✓ {{ f.label }}</li>
        </ul>
        <button
          class="btn-primary mt-5 w-full text-sm"
          :disabled="plans.currentPlan?.slug === plan.slug || upgrading"
          @click="upgrade(plan.slug)"
        >
          {{ plans.currentPlan?.slug === plan.slug ? 'Plan actual' : upgrading ? 'Redirigiendo…' : 'Seleccionar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlansStore } from '@/stores/plans.store';
import { formatMoney } from '@/shared/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { Plan } from '@/shared/types';

const plans = usePlansStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const upgrading = ref(false);

const availablePlans = computed(() => plans.plans);

function formatPrice(plan: Plan) {
  const amount = plans.billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  return amount === 0 ? 'Gratis' : formatMoney(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function upgrade(slug: string) {
  upgrading.value = true;
  try {
    const { checkoutUrl } = await plans.startCheckout(slug);
    window.location.href = checkoutUrl;
  } catch (e) {
    toast.error(apiErrorMessage(e));
    upgrading.value = false;
  }
}

async function handlePaymentReturn() {
  const status = route.query.payment;
  if (!status || typeof status !== 'string') return;

  await plans.fetchCurrent().catch(() => undefined);

  if (status === 'success') {
    toast.success('Pago recibido. Tu plan se actualizará en unos segundos.');
  } else if (status === 'pending') {
    toast.info('Pago pendiente. Te avisaremos cuando se confirme.');
  } else if (status === 'failure') {
    toast.error('El pago no se completó. Puedes intentarlo de nuevo.');
  }

  router.replace({ query: {} });
}

onMounted(async () => {
  await Promise.all([plans.fetchPublicPlans(), plans.fetchCurrent()]).catch((e) =>
    toast.error(apiErrorMessage(e)),
  );
  await handlePaymentReturn();
});
</script>
