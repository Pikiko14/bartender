<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Mesas</h1>
        <p class="text-sm text-slate-400">QR por mesa · cuentas abiertas y cierre con factura.</p>
      </div>
      <form class="flex gap-2" @submit.prevent="add">
        <input
          v-model.number="number"
          type="number"
          min="1"
          class="input w-24"
          placeholder="Nº"
          required
        />
        <button class="btn-primary text-sm">Crear mesa</button>
      </form>
    </div>

    <section v-if="openBills.length" class="mt-8">
      <h2 class="text-lg font-semibold text-neon-cyan">Cuentas abiertas ({{ openBills.length }})</h2>
      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div v-for="bill in openBills" :key="bill.tableSession.id" class="card p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-lg font-bold">{{ bill.tableName ?? `Mesa ${bill.tableNumber ?? ''}` }}</p>
              <p class="text-xs text-slate-500">
                {{ bill.orderCount }} pedido(s) · abierta
                {{ formatOpened(bill.tableSession.openedAt) }}
              </p>
            </div>
            <p class="text-xl font-bold text-neon-cyan">{{ formatMoney(bill.total) }}</p>
          </div>
          <ul class="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-300">
            <li v-for="line in bill.lines" :key="line.menuItemId" class="flex justify-between gap-2">
              <span class="truncate">{{ line.quantity }}× {{ line.name }}</span>
              <span class="shrink-0 text-slate-400">{{ formatMoney(line.subtotal) }}</span>
            </li>
          </ul>
          <button
            type="button"
            class="btn-primary mt-4 w-full text-sm"
            :disabled="closingId === bill.tableSession.id"
            @click="closeBill(bill.tableSession.id)"
          >
            {{ closingId === bill.tableSession.id ? 'Cerrando…' : 'Cerrar mesa y facturar' }}
          </button>
        </div>
      </div>
    </section>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="t in tables.tables" :key="t.id" class="card p-4 text-center">
        <img
          v-if="qrImages[t.id]"
          :src="qrImages[t.id]"
          :alt="t.name"
          class="mx-auto h-40 w-40 rounded-lg bg-white p-2"
        />
        <div
          v-else
          class="mx-auto flex h-40 w-40 items-center justify-center rounded-lg bg-ink-800 text-xs text-slate-500"
        >
          Generando QR…
        </div>
        <p class="mt-3 font-semibold">{{ t.name }}</p>
        <span
          v-if="billForTable(t.id)"
          class="badge mt-1 bg-neon-cyan/15 text-neon-cyan"
        >
          Cuenta abierta · {{ formatMoney(billForTable(t.id)!.total) }}
        </span>
        <a :href="t.qrUrl" target="_blank" class="mt-2 block truncate text-xs text-neon-cyan">{{
          t.qrUrl
        }}</a>
        <div class="mt-3 flex justify-center gap-2">
          <a
            v-if="qrImages[t.id]"
            :href="qrImages[t.id]"
            :download="`qr-${t.slug}.png`"
            class="btn-ghost px-3 py-1.5 text-xs"
            >Descargar</a
          >
          <button class="btn-ghost px-3 py-1.5 text-xs text-red-400" @click="tables.remove(t.id)">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ordersApi } from '@/services/api';
import { useTablesStore } from '@/stores/tables.store';
import { formatMoney } from '@/shared/format';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { TableBill, TableEntity } from '@/shared/types';

const tables = useTablesStore();
const toast = useToast();
const number = ref<number>(1);
const qrImages = reactive<Record<string, string>>({});
const openBills = ref<TableBill[]>([]);
const closingId = ref<string | null>(null);

const billByTableId = computed(() => {
  const map = new Map<string, TableBill>();
  for (const bill of openBills.value) map.set(bill.tableId, bill);
  return map;
});

function billForTable(tableId: string) {
  return billByTableId.value.get(tableId);
}

function formatOpened(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

async function loadOpenBills() {
  openBills.value = await ordersApi.openTableBills().catch(() => []);
}

async function closeBill(tableSessionId: string) {
  closingId.value = tableSessionId;
  try {
    await ordersApi.closeTableBill(tableSessionId);
    toast.success('Mesa cerrada · factura consolidada.');
    await loadOpenBills();
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    closingId.value = null;
  }
}

async function loadQr(list: TableEntity[]) {
  for (const t of list) {
    if (qrImages[t.id]) continue;
    try {
      qrImages[t.id] = await tables.qrObjectUrl(t.id);
    } catch {
      /* ignore */
    }
  }
}

watch(
  () => tables.tables.length,
  () => loadQr(tables.tables),
);

async function add() {
  try {
    await tables.create(number.value);
    number.value += 1;
    toast.success('Mesa creada.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  }
}

onMounted(async () => {
  await tables.fetchAll().catch((e) => toast.error(apiErrorMessage(e)));
  await loadQr(tables.tables);
  await loadOpenBills().catch((e) => toast.error(apiErrorMessage(e)));
});
</script>
