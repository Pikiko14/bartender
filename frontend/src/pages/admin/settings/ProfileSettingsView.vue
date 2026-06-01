<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <div class="card p-5">
      <h2 class="font-semibold">Tu perfil</h2>
      <p class="mt-1 text-sm text-slate-400">Datos de acceso al panel.</p>

      <dl class="mt-4 space-y-3 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-slate-400">Nombre</dt>
          <dd class="font-medium">{{ auth.user?.name ?? '—' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-slate-400">Email</dt>
          <dd class="truncate">{{ auth.user?.email ?? '—' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-slate-400">Rol</dt>
          <dd>
            <span class="badge bg-ink-700 text-slate-300">{{ auth.user?.role ?? '—' }}</span>
          </dd>
        </div>
      </dl>
    </div>

    <template v-if="canManageMusic">
      <MusicProviderSettings :status="providerStatus" @updated="onProviderUpdated" />
      <SpotifyConfigPanel
        v-if="isSpotifyProvider"
        class="lg:col-span-2"
        :status="providerStatus"
        @updated="onProviderUpdated"
      />
    </template>

    <div v-else class="card p-5 text-sm text-slate-500">
      No tienes permisos para gestionar la reproducción musical.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { useMusicProviderStatus } from '@/composables/useMusicProviderStatus';
import MusicProviderSettings from '@/components/admin/MusicProviderSettings.vue';
import SpotifyConfigPanel from '@/components/admin/SpotifyConfigPanel.vue';

const auth = useAuthStore();
const business = useBusinessStore();
const { status: providerStatus, isSpotifyProvider, refresh: refreshProviderStatus } =
  useMusicProviderStatus();

const canManageMusic = computed(() => auth.can('music:playback'));

async function onProviderUpdated() {
  await refreshProviderStatus();
  if (auth.hasRole('OWNER')) {
    await business.fetchMine().catch(() => undefined);
  }
}

onMounted(async () => {
  if (canManageMusic.value) {
    await refreshProviderStatus().catch(() => undefined);
  }
});
</script>
