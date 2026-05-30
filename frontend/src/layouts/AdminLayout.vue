<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-30 w-64 -translate-x-full border-r border-ink-700 bg-ink-900/95 p-5 transition-transform lg:translate-x-0"
      :class="{ '!translate-x-0': sidebarOpen }"
    >
      <RouterLink to="/app" class="text-2xl font-extrabold text-neon-pink">Bartender</RouterLink>
      <p class="mt-1 truncate text-xs text-slate-500">
        {{ business.current?.name ?? 'Sin negocio' }}
      </p>

      <nav class="mt-8 space-y-1">
        <RouterLink
          v-for="link in visibleLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-ink-700"
          active-class="bg-neon-pink/15 !text-neon-pink"
          @click="sidebarOpen = false"
        >
          <span>{{ link.icon }}</span
          >{{ link.label }}
        </RouterLink>
      </nav>

      <div class="absolute inset-x-5 bottom-5 space-y-2">
        <a
          v-if="djShareHref"
          :href="djShareHref"
          target="_blank"
          class="block text-xs text-slate-500 hover:text-slate-300"
          >↗ Pantalla DJ (compartir)</a
        >
        <a v-else href="/dj" target="_blank" class="block text-xs text-slate-500 hover:text-slate-300"
          >↗ Pantalla DJ</a
        >
        <a href="/kds" target="_blank" class="block text-xs text-slate-500 hover:text-slate-300"
          >↗ Pantalla cocina (KDS)</a
        >
        <a href="/bar" target="_blank" class="block text-xs text-slate-500 hover:text-slate-300"
          >↗ Pantalla barra</a
        >
      </div>
    </aside>

    <!-- Main -->
    <div class="flex w-full flex-col lg:pl-64">
      <header
        class="sticky top-0 z-20 flex items-center justify-between border-b border-ink-700 bg-ink-900/80 px-5 py-3 backdrop-blur"
      >
        <button class="text-slate-400 lg:hidden" @click="sidebarOpen = !sidebarOpen">☰</button>
        <div class="flex items-center gap-3">
          <span class="hidden text-sm text-slate-400 sm:block">{{ auth.user?.name }}</span>
          <span class="badge bg-ink-700 text-slate-300">{{ auth.user?.role }}</span>
          <button class="btn-ghost px-3 py-1.5 text-sm" @click="logout">Salir</button>
        </div>
      </header>

      <main class="flex-1 p-5">
        <div v-if="needsBusiness" class="card mx-auto mt-10 max-w-lg p-8 text-center">
          <h2 class="text-xl font-bold">Crea tu primer negocio</h2>
          <p class="mt-2 text-sm text-slate-400">Necesitas un negocio para empezar a operar.</p>
          <form class="mt-6 space-y-3 text-left" @submit.prevent="createBusiness">
            <input
              v-model="newBizName"
              class="input"
              placeholder="Nombre del bar/restaurante"
              required
            />
            <button class="btn-primary w-full">Crear negocio</button>
          </form>
        </div>
        <RouterView v-else />
      </main>
    </div>

    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useBusinessStore } from '@/stores/business.store';
import { realtime } from '@/socket/socket';
import { djShareUrl } from '@/shared/dj-share';
import { setDocumentTitle } from '@/shared/document-title';
import ToastHost from '@/components/ToastHost.vue';

const auth = useAuthStore();
const business = useBusinessStore();
const router = useRouter();
const route = useRoute();

const sidebarOpen = ref(false);
const newBizName = ref('');

const links = [
  { to: '/app/dashboard', label: 'Dashboard', icon: '📊', perm: 'order:view' },
  { to: '/app/orders', label: 'Pedidos', icon: '🧾', perm: 'order:view' },
  { to: '/app/menu', label: 'Menú', icon: '🍔', perm: 'menu:view' },
  { to: '/app/tables', label: 'Mesas', icon: '🪑', perm: 'table:view' },
  { to: '/app/users', label: 'Usuarios', icon: '👥', perm: 'user:view' },
  { to: '/app/music', label: 'Música', icon: '🎵', perm: 'music:moderate' },
  { to: '/app/plans', label: 'Plan', icon: '💎', perm: 'business:manage' },
  { to: '/app/analytics', label: 'Analytics', icon: '📈', perm: 'analytics:view' },
];

const visibleLinks = computed(() => links.filter((l) => auth.can(l.perm)));
const needsBusiness = computed(() => auth.hasRole('OWNER') && !auth.user?.businessId);
const djShareHref = computed(() =>
  business.current?.slug ? djShareUrl(business.current.slug) : '',
);

watch(
  () => route.meta.title,
  (title) => setDocumentTitle(typeof title === 'string' ? title : undefined),
  { immediate: true },
);

onMounted(async () => {
  if (auth.hasRole('OWNER')) {
    await business.fetchMine().catch(() => undefined);
  }
  if (auth.user?.businessId) {
    realtime.joinBusiness(auth.user.businessId);
  }
});

async function createBusiness() {
  await business.create(newBizName.value);
  await auth.restoreSession();
}

function logout() {
  realtime.disconnect();
  auth.logout();
  router.push('/login');
}
</script>
