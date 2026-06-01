<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <form class="card p-5 lg:col-span-2" @submit.prevent="saveBusiness">
      <h2 class="font-semibold">Datos del establecimiento</h2>
      <p class="mt-1 text-sm text-slate-400">Información visible en la carta y pantallas del local.</p>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block sm:col-span-2">
          <span class="mb-1 block text-xs text-slate-400">Nombre</span>
          <input v-model="form.name" class="input" required minlength="2" maxlength="120" />
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1 block text-xs text-slate-400">Descripción</span>
          <textarea
            v-model="form.description"
            class="input min-h-[88px] resize-y"
            maxlength="500"
            placeholder="Opcional"
          />
        </label>
        <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-ink-800 p-3 sm:col-span-2">
          <input v-model="form.active" type="checkbox" />
          <span class="text-sm">Establecimiento activo</span>
        </label>
      </div>

      <button type="submit" class="btn-primary mt-4 text-sm" :disabled="busy || !hasBusinessChanges">
        Guardar negocio
      </button>
    </form>

    <template v-if="canManageMusic">
      <MusicProviderSettings :status="providerStatus" @updated="onProviderUpdated" />
      <SpotifyConfigPanel v-if="isSpotifyProvider" :status="providerStatus" @updated="onProviderUpdated" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import { useMusicProviderStatus } from '@/composables/useMusicProviderStatus';
import MusicProviderSettings from '@/components/admin/MusicProviderSettings.vue';
import SpotifyConfigPanel from '@/components/admin/SpotifyConfigPanel.vue';

const auth = useAuthStore();
const business = useBusinessStore();
const toast = useToast();
const { status: providerStatus, isSpotifyProvider, refresh: refreshProviderStatus } =
  useMusicProviderStatus();

const busy = ref(false);
const form = reactive({
  name: '',
  description: '',
  active: true,
});

const canManageMusic = computed(() => auth.can('music:playback'));

const hasBusinessChanges = computed(() => {
  const current = business.current;
  if (!current) return false;
  return (
    form.name.trim() !== current.name ||
    (form.description.trim() || null) !== (current.description?.trim() || null) ||
    form.active !== current.active
  );
});

watch(
  () => business.current,
  (current) => {
    if (!current) return;
    form.name = current.name;
    form.description = current.description ?? '';
    form.active = current.active;
  },
  { immediate: true },
);

async function onProviderUpdated() {
  await refreshProviderStatus();
  await business.fetchMine().catch(() => undefined);
}

async function saveBusiness() {
  const current = business.current;
  if (!current || busy.value) return;

  busy.value = true;
  try {
    await business.update(current.id, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      active: form.active,
    });
    toast.success('Negocio actualizado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (auth.hasRole('OWNER')) {
    await business.fetchMine().catch(() => undefined);
  }
  if (canManageMusic.value) {
    await refreshProviderStatus().catch(() => undefined);
  }
});
</script>
