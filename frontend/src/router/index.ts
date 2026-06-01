import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { setDocumentTitle, titleFromRoute } from '@/shared/document-title';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/HomeView.vue'), meta: { title: 'Inicio' } },
  {
    path: '/pricing',
    name: 'pricing',
    component: () => import('@/pages/PricingView.vue'),
    meta: { title: 'Precios' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginView.vue'),
    meta: { guestOnly: true, title: 'Iniciar sesión' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/RegisterView.vue'),
    meta: { guestOnly: true, title: 'Registro' },
  },
  {
    path: '/b/:businessSlug/table/:tableSlug',
    name: 'scan',
    component: () => import('@/pages/client/ClientApp.vue'),
    meta: { title: 'Carta' },
  },
  {
    path: '/app',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/admin/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('@/pages/admin/OrdersView.vue'),
        meta: { title: 'Pedidos' },
      },
      {
        path: 'menu',
        name: 'admin-menu',
        component: () => import('@/pages/admin/MenuView.vue'),
        meta: { title: 'Menú' },
      },
      {
        path: 'tables',
        name: 'admin-tables',
        component: () => import('@/pages/admin/TablesView.vue'),
        meta: { title: 'Mesas' },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersView.vue'),
        meta: { title: 'Usuarios' },
      },
      {
        path: 'music',
        name: 'admin-music',
        component: () => import('@/pages/admin/MusicView.vue'),
        meta: { title: 'Música' },
      },
      {
        path: 'spotify',
        name: 'admin-spotify',
        component: () => import('@/pages/admin/SpotifyView.vue'),
        meta: { title: 'Spotify' },
      },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: () => import('@/pages/admin/AnalyticsView.vue'),
        meta: { title: 'Analytics' },
      },
      {
        path: 'plans',
        name: 'admin-plans',
        component: () => import('@/pages/admin/PlansView.vue'),
        meta: { title: 'Plan' },
      },
    ],
  },
  {
    path: '/spotify-player',
    name: 'spotify-player',
    component: () => import('@/pages/displays/SpotifyPlayerView.vue'),
    meta: { requiresAuth: true, title: 'Reproductor Spotify' },
  },
  {
    path: '/b/:businessSlug/spotify-player',
    name: 'spotify-player-shared',
    component: () => import('@/pages/displays/SpotifyPlayerView.vue'),
    meta: { title: 'Reproductor Spotify' },
  },
  {
    path: '/b/:businessSlug/dj',
    name: 'dj-shared',
    component: () => import('@/pages/displays/DjDisplay.vue'),
    meta: { sharedDisplay: true, title: 'Pantalla DJ' },
  },
  {
    path: '/dj',
    name: 'dj',
    component: () => import('@/pages/displays/DjDisplay.vue'),
    meta: { requiresAuth: true, title: 'Pantalla DJ' },
  },
  {
    path: '/kds',
    name: 'kds',
    component: () => import('@/pages/displays/KitchenDisplay.vue'),
    meta: { requiresAuth: true, title: 'Cocina (KDS)' },
  },
  {
    path: '/bar',
    name: 'bar',
    component: () => import('@/pages/displays/BarDisplay.vue'),
    meta: { requiresAuth: true, title: 'Barra' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : titleFromRoute(to.matched);
  setDocumentTitle(title);
});
