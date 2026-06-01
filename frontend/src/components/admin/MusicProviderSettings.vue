<template>
  <div class="card p-5">
    <h2 class="font-semibold">Proveedor musical</h2>
    <p class="mt-2 text-sm text-slate-400">
      YouTube usa la pantalla DJ. Spotify usa el reproductor Web Playback SDK.
    </p>

    <div class="mt-4 space-y-2">
      <label class="flex cursor-pointer items-center gap-3 rounded-lg bg-ink-800 p-3">
        <input v-model="providerChoice" type="radio" value="YOUTUBE" name="provider" />
        <span>YouTube</span>
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

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="btn-primary text-sm"
        :disabled="busy || providerChoice === status?.musicProvider"
        @click="saveProvider"
      >
        Guardar proveedor
      </button>
      <button
        v-if="providerChoice === 'SPOTIFY' && !isEffectivelyConnected"
        type="button"
        class="btn-cyan text-sm"
        :disabled="busy"
        @click="connect"
      >
        Conectar Spotify
      </button>
    </div>

    <p v-if="providerChoice === 'SPOTIFY' && !isEffectivelyConnected" class="mt-3 text-sm text-amber-300">
      Conecta Spotify antes de activarlo como proveedor.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { spotifyApi } from '@/services/api';
import { apiErrorMessage } from '@/services/http';
import { useToast } from '@/composables/useToast';
import type { SpotifyConnectionStatus } from '@/shared/spotify.types';

const props = defineProps<{
  status: SpotifyConnectionStatus | null;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const toast = useToast();
const providerChoice = ref<'YOUTUBE' | 'SPOTIFY'>('YOUTUBE');
const busy = ref(false);

/** Alineado con backend: tokens OAuth o perfil ya vinculado. */
const isEffectivelyConnected = computed(
  () => props.status?.connected || !!props.status?.spotifyUserId || !!props.status?.spotifyDisplayName,
);

watch(
  () => props.status?.musicProvider,
  (p) => {
    if (p) providerChoice.value = p;
  },
  { immediate: true },
);

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

async function saveProvider() {
  busy.value = true;
  try {
    // Si el usuario elige Spotify pero aún no hay conexión OAuth,
    // enviamos automáticamente al flujo de "Conectar Spotify".
    if (providerChoice.value === 'SPOTIFY' && !isEffectivelyConnected.value) {
      await connect();
      return;
    }

    await spotifyApi.setMusicProvider(providerChoice.value);
    emit('updated');
    toast.success('Proveedor musical actualizado.');
  } catch (e) {
    toast.error(apiErrorMessage(e));
  } finally {
    busy.value = false;
  }
}
</script>
