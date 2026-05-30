import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/HomeView.vue') },
  { path: '/pricing', name: 'pricing', component: () => import('@/pages/PricingView.vue') },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/auth/RegisterView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/b/:businessSlug/table/:tableSlug',
    name: 'scan',
    component: () => import('@/pages/client/ClientApp.vue'),
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
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('@/pages/admin/OrdersView.vue'),
      },
      { path: 'menu', name: 'admin-menu', component: () => import('@/pages/admin/MenuView.vue') },
      {
        path: 'tables',
        name: 'admin-tables',
        component: () => import('@/pages/admin/TablesView.vue'),
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/pages/admin/UsersView.vue'),
      },
      {
        path: 'music',
        name: 'admin-music',
        component: () => import('@/pages/admin/MusicView.vue'),
      },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: () => import('@/pages/admin/AnalyticsView.vue'),
      },
      {
        path: 'plans',
        name: 'admin-plans',
        component: () => import('@/pages/admin/PlansView.vue'),
      },
    ],
  },
  {
    path: '/b/:businessSlug/dj',
    name: 'dj-shared',
    component: () => import('@/pages/displays/DjDisplay.vue'),
    meta: { sharedDisplay: true },
  },
  {
    path: '/dj',
    name: 'dj',
    component: () => import('@/pages/displays/DjDisplay.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/kds',
    name: 'kds',
    component: () => import('@/pages/displays/KitchenDisplay.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/bar',
    name: 'bar',
    component: () => import('@/pages/displays/BarDisplay.vue'),
    meta: { requiresAuth: true },
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
