<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Spotify</h1>
        <p class="text-sm text-slate-400">Conecta Spotify como motor de reproducción del local.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/spotify-player" target="_blank" class="btn-cyan text-sm">↗ Abrir reproductor</a>
        <RouterLink to="/app/music" class="btn-ghost text-sm">← Música</RouterLink>
      </div>
    </div>

    <div v-if="route.query.connected === '1'" class="mt-4 card border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
      Spotify conectado correctamente.
    </div>
    <div v-if="route.query.error" class="mt-4 card border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
      Error al conectar Spotify ({{ route.query.error }}).
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <div class="card p-5">
        <h2 class="font-semibold">Estado de conexión</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-slate-400">Proveedor activo</dt>
            <dd class="font-medium">{{ status?.musicProvider ?? '—' }}</dd>
          </div>
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
      </div>

      <div class="card p-5">
        <h2 class="font-semibold">Proveedor musical</h2>
        <p class="mt-2 text-sm text-slate-400">
          YouTube sigue disponible. Spotify usa la misma cola de Bartender.
        </p>

        <div class="mt-4 space-y-2">
          <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-ink-800 p-3">
            <input v-model="providerChoice" type="radio" value="YOUTUBE" name="provider" />
            <span>YouTube (predeterminado)</span>
          </label>
          <label
            class="flex cursor-pointer items-center gap-3 rounded-lg bg-ink-800 p-3"
            :class="!status?.connected ? 'opacity-90' : ''"
          >
            <input
              v-model="providerChoice"
              type="radio"
              value="SPOTIFY"
              name="provider"
            />
            <span>Spotify</span>
          </label>
        </div>

        <button
          type="button"
          class="btn-primary mt-4 text-sm"
          :disabled="busy || providerChoice === status?.musicProvider"
          @click="saveProvider"
        >
          Guardar proveedor
        </button>

        <p v-if="status?.musicProvider === 'SPOTIFY' && !status?.hasActiveDevice" class="mt-4 text-sm text-amber-300">
          No hay un reproductor Spotify activo. Abre
          <a href="/spotify-player" target="_blank" class="text-neon-cyan underline">/spotify-player</a>.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { spotifyApi } from '@/services/api';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { SpotifyConnectionStatus } from '@/shared/spotify.types';

const route = useRoute();
const toast = useToast();
const status = ref<SpotifyConnectionStatus | null>(null);
const providerChoice = ref<'YOUTUBE' | 'SPOTIFY'>('YOUTUBE');
const busy = ref(false);

watch(
  () => status.value?.musicProvider,
  (p) => {
    if (p) providerChoice.value = p;
  },
);

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

async function loadStatus() {
  status.value = await spotifyApi.status();
  providerChoice.value = status.value.musicProvider;
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
    status.value = await spotifyApi.disconnect();
    providerChoice.value = 'YOUTUBE';
    toast.success('Spotify desconectado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

async function saveProvider() {
  busy.value = true;
  try {
    if (providerChoice.value === 'SPOTIFY' && !status.value?.connected) {
      const { url } = await spotifyApi.connect();
      window.location.href = url;
      return;
    }
    await spotifyApi.setMusicProvider(providerChoice.value);
    await loadStatus();
    toast.success('Proveedor musical actualizado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void loadStatus().catch((e) => toast.error(apiErrorMessage(e)));
});
</script>
