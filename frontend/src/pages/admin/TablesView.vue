<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Mesas</h1>
        <p class="text-sm text-slate-400">Cada mesa tiene su QR único.</p>
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

    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <a :href="t.qrUrl" target="_blank" class="block truncate text-xs text-neon-cyan">{{
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
import { onMounted, reactive, ref, watch } from 'vue';
import { useTablesStore } from '@/stores/tables.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { TableEntity } from '@/shared/types';

const tables = useTablesStore();
const toast = useToast();
const number = ref<number>(1);
const qrImages = reactive<Record<string, string>>({});

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
});
</script>
