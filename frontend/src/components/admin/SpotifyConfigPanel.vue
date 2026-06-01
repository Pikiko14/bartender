<template>
  <div class="card p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-semibold">Configuración Spotify</h2>
        <p class="mt-1 text-sm text-slate-400">Estado del reproductor y cuenta conectada.</p>
      </div>
      <a href="/spotify-player" target="_blank" class="btn-cyan text-sm">↗ Abrir reproductor</a>
    </div>

    <dl class="mt-4 space-y-3 text-sm">
      <div class="flex justify-between gap-4">
        <dt class="text-slate-400">Spotify conectado</dt>
        <dd :class="status?.connected ? 'text-emerald-400' : 'text-slate-400'">
          {{ status?.connected ? 'Sí' : 'No' }}
        </dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-slate-400">Usuario</dt>
        <dd class="truncate">{{ status?.spotifyDisplayName ?? status?.spotifyUserId ?? '—' }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-slate-400">Device activo</dt>
        <dd class="truncate font-mono text-xs">{{ status?.spotifyDeviceId ?? '—' }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-slate-400">Última sincronización</dt>
        <dd>{{ formatDate(status?.spotifyLastSyncAt) }}</dd>
      </div>
    </dl>

    <div class="mt-6 flex flex-wrap gap-2">
      <button type="button" class="btn-cyan text-sm" :disabled="busy" @click="connect">
        {{ status?.connected ? 'Reconectar Spotify' : 'Conectar Spotify' }}
      </button>
      <button
        v-if="status?.connected"
        type="button"
        class="btn-ghost text-sm text-red-400"
        :disabled="busy"
        @click="disconnect"
      >
        Desconectar
      </button>
    </div>

    <p v-if="!status?.hasActiveDevice" class="mt-4 text-sm text-amber-300">
      No hay un reproductor Spotify activo. Abre
      <a href="/spotify-player" target="_blank" class="text-neon-cyan underline">/spotify-player</a>
      en la máquina conectada al sonido.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { spotifyApi } from '@/services/api';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { SpotifyConnectionStatus } from '@/shared/spotify.types';

defineProps<{
  status: SpotifyConnectionStatus | null;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const toast = useToast();
const busy = ref(false);

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

async function connect() {
  busy.value = true;
  try {
    const { url } = await spotifyApi.connect();
    window.location.href = url;
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

async function disconnect() {
  busy.value = true;
  try {
    await spotifyApi.disconnect();
    emit('updated');
    toast.success('Spotify desconectado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}
</script>
