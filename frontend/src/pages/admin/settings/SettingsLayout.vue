<template>
  <div>
    <h1 class="text-2xl font-bold">Configuración</h1>
    <p class="text-sm text-slate-400">Perfil personal y ajustes del establecimiento.</p>

    <div
      v-if="route.query.connected === '1'"
      class="mt-4 card border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
    >
      Spotify conectado correctamente.
    </div>
    <div
      v-if="route.query.error"
      class="mt-4 card border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
    >
      Error al conectar Spotify ({{ route.query.error }}).
    </div>

    <nav class="mt-6 flex flex-wrap gap-2 border-b border-ink-700 pb-3">
      <RouterLink
        to="/app/settings/profile"
        class="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-ink-800 hover:text-slate-200"
        active-class="!bg-neon-pink/15 !text-neon-pink"
      >
        Perfil
      </RouterLink>
      <RouterLink
        v-if="canManageBusiness"
        to="/app/settings/business"
        class="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-ink-800 hover:text-slate-200"
        active-class="!bg-neon-pink/15 !text-neon-pink"
      >
        Negocio
      </RouterLink>
    </nav>

    <div class="mt-6">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
const route = useRoute();

const canManageBusiness = computed(() => auth.can('business:manage'));
</script>
