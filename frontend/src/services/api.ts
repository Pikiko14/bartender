import { http, unwrap } from './http';
import type {
  AnalyticsOverview,
  AuthResponse,
  AuthUser,
  Business,
  GuestSession,
  MenuCategory,
  MenuItem,
  MusicQueue,
  MusicRequest,
  Order,
  OrderStatus,
  TableEntity,
  YoutubeVideo,
} from '@/shared/types';

// ---- Auth ----
export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    unwrap<AuthResponse>(http.post('/auth/register', body)),
  login: (body: { email: string; password: string }) =>
    unwrap<AuthResponse>(http.post('/auth/login', body)),
  me: () => unwrap<AuthUser>(http.get('/auth/me')),
};

// ---- Business ----
export const businessApi = {
  mine: () => unwrap<Business[]>(http.get('/businesses/mine')),
  create: (body: { name: string; description?: string }) =>
    unwrap<Business>(http.post('/businesses', body)),
  update: (id: string, body: Partial<Business>) =>
    unwrap<Business>(http.patch(`/businesses/${id}`, body)),
  publicBySlug: (slug: string) => unwrap<Business>(http.get(`/businesses/public/${slug}`)),
};

// ---- Users ----
export const usersApi = {
  list: () => unwrap<{ items: AuthUser[] }>(http.get('/users')),
  create: (body: Record<string, unknown>) => unwrap<AuthUser>(http.post('/users', body)),
  update: (id: string, body: Record<string, unknown>) =>
    unwrap<AuthUser>(http.patch(`/users/${id}`, body)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/users/${id}`)),
};

// ---- Tables ----
export const tablesApi = {
  list: () => unwrap<TableEntity[]>(http.get('/tables')),
  create: (body: { number: number; name?: string }) =>
    unwrap<TableEntity>(http.post('/tables', body)),
  update: (id: string, body: Partial<TableEntity>) =>
    unwrap<TableEntity>(http.patch(`/tables/${id}`, body)),
  remove: (id: string) => unwrap<{ deleted: boolean }>(http.delete(`/tables/${id}`)),
  async qrObjectUrl(id: string): Promise<string> {
    const res = await http.get(`/tables/${id}/qr.png`, { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  },
};

// ---- Menu (admin) ----
export const menuApi = {
  categories: () => unwrap<MenuCategory[]>(http.get('/menu/categories')),
  createCategory: (body: Record<string, unknown>) =>
    unwrap<MenuCategory>(http.post('/menu/categories', body)),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    unwrap<MenuCategory>(http.patch(`/menu/categories/${id}`, body)),
  removeCategory: (id: string) => http.delete(`/menu/categories/${id}`),
  items: () => unwrap<MenuItem[]>(http.get('/menu/items')),
  createItem: (body: Record<string, unknown>) => unwrap<MenuItem>(http.post('/menu/items', body)),
  updateItem: (id: string, body: Record<string, unknown>) =>
    unwrap<MenuItem>(http.patch(`/menu/items/${id}`, body)),
  removeItem: (id: string) => http.delete(`/menu/items/${id}`),
};

export const uploadsApi = {
  menuImage: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<{ url: string }>(
      http.post('/uploads/menu', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};

// ---- Orders (staff) ----
export const ordersApi = {
  list: (status?: OrderStatus) =>
    unwrap<Order[]>(http.get('/orders', { params: status ? { status } : {} })),
  kitchen: () => unwrap<Order[]>(http.get('/orders/kitchen')),
  bar: () => unwrap<Order[]>(http.get('/orders/bar')),
  updateStatus: (id: string, status: OrderStatus) =>
    unwrap<Order>(http.patch(`/orders/${id}/status`, { status })),
};

// ---- Music (staff) ----
export const musicApi = {
  queue: () => unwrap<MusicQueue>(http.get('/music/queue')),
  approve: (id: string) => unwrap<MusicRequest>(http.patch(`/music/requests/${id}/approve`, {})),
  reject: (id: string) => unwrap<MusicRequest>(http.patch(`/music/requests/${id}/reject`, {})),
  setPriority: (id: string, priority: number) =>
    unwrap<MusicRequest>(http.patch(`/music/requests/${id}/priority`, { priority })),
  playNext: () => unwrap<MusicRequest | null>(http.post('/music/play-next', {})),
  skip: () => unwrap<MusicRequest | null>(http.post('/music/skip', {})),
  playRequest: (id: string) => unwrap<MusicRequest>(http.post(`/music/requests/${id}/play`, {})),
};

// ---- Analytics ----
export const analyticsApi = {
  overview: (params?: { from?: string; to?: string }) =>
    unwrap<AnalyticsOverview>(http.get('/analytics/overview', { params })),
};

// ---- Público (cliente / QR) ----
export const publicApi = {
  scan: (businessSlug: string, tableSlug: string) =>
    unwrap<{ session: GuestSession; business: Business; table: TableEntity }>(
      http.post('/public/sessions/scan', { businessSlug, tableSlug }),
    ),
  menu: (businessSlug: string) => unwrap<MenuCategory[]>(http.get(`/public/menu/${businessSlug}`)),
  createOrder: (body: {
    sessionId: string;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    notes?: string;
  }) => unwrap<Order>(http.post('/public/orders', body)),
  ordersBySession: (sessionId: string) =>
    unwrap<Order[]>(http.get(`/public/orders/session/${sessionId}`)),
  searchMusic: (q: string) =>
    unwrap<YoutubeVideo[]>(http.get('/public/music/search', { params: { q } })),
  requestSong: (body: {
    sessionId: string;
    youtubeId: string;
    title: string;
    thumbnail?: string;
    channelTitle?: string;
  }) => unwrap<MusicRequest>(http.post('/public/music/request', body)),
  voteSong: (id: string, sessionId: string) =>
    unwrap<MusicRequest>(http.post(`/public/music/requests/${id}/vote`, { sessionId })),
  publicQueue: (businessSlug: string) =>
    unwrap<MusicQueue>(http.get(`/public/music/${businessSlug}/queue`)),
};

// ---- Planes y suscripciones ----
export const plansApi = {
  publicList: () => unwrap<import('@/shared/types').Plan[]>(http.get('/public/plans')),
  current: () =>
    unwrap<{ subscription: import('@/shared/types').BusinessSubscription; plan: import('@/shared/types').Plan }>(
      http.get('/subscriptions/current'),
    ),
  changePlan: (planSlug: string, billingCycle: 'monthly' | 'yearly') =>
    unwrap<{ subscription: import('@/shared/types').BusinessSubscription; plan: import('@/shared/types').Plan }>(
      http.post('/subscriptions/change-plan', { planSlug, billingCycle }),
    ),
};
