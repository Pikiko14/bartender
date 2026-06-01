export type Role = 'OWNER' | 'ADMIN' | 'WAITER' | 'DJ' | 'CASHIER' | 'KITCHEN' | 'BAR';

export type PreparationArea = 'KITCHEN' | 'BAR';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type MusicStatus = 'pending' | 'approved' | 'rejected' | 'playing' | 'played' | 'skipped';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string | null;
  permissions: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export type MusicProvider = 'YOUTUBE' | 'SPOTIFY';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  description: string | null;
  ownerId: string;
  active: boolean;
  subscriptionStatus: string;
  musicProvider?: MusicProvider;
}

export interface TableEntity {
  id: string;
  businessId: string;
  number: number;
  name: string;
  slug: string;
  qrUrl: string;
  active: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number | null;
  available: boolean;
  preparationArea: PreparationArea;
}

export interface MenuCategory {
  id: string;
  name: string;
  type: string;
  order: number;
  active: boolean;
  image: string | null;
  items?: MenuItem[];
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  preparationArea: PreparationArea;
  notes: string | null;
  image?: string | null;
  subtotal: number;
}

export interface Order {
  id: string;
  businessId: string;
  tableId: string;
  tableNumber?: number;
  tableName?: string;
  sessionId: string;
  tableSessionId?: string;
  items: OrderItem[];
  total: number;
  areas: PreparationArea[];
  status: OrderStatus;
  notes: string | null;
  createdAt?: string;
}

export interface MusicRequest {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string | null;
  channelTitle: string | null;
  durationSeconds: number | null;
  requestedBy: string;
  status: MusicStatus;
  priority: number;
  votes: number;
  playedAt: string | null;
  createdAt?: string;
  provider?: MusicProvider;
  spotifyId?: string | null;
  artist?: string | null;
  album?: string | null;
}

export interface MusicQueue {
  nowPlaying: MusicRequest | null;
  queue: MusicRequest[];
  pending?: MusicRequest[];
}

export interface YoutubeVideo {
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  durationSeconds: number | null;
}

export interface GuestSession {
  sessionId: string;
  businessId: string;
  tableId: string;
  tableSessionId: string;
  createdAt: string;
}

export type TableSessionStatus = 'open' | 'closed';

export interface TableSession {
  id: string;
  businessId: string;
  tableId: string;
  status: TableSessionStatus;
  openedAt: string;
  closedAt: string | null;
  customerId: string | null;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  document: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface TableBillLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image: string | null;
}

export interface TableBill {
  tableSession: TableSession | null;
  tableId: string;
  tableName?: string;
  tableNumber?: number;
  customer: Customer | null;
  orders: Order[];
  lines: TableBillLine[];
  orderCount: number;
  total: number;
  hasActiveSession: boolean;
  closed?: boolean;
}

export interface ScanResult {
  session: GuestSession;
  business: Business;
  table: TableEntity;
  tableSession: TableSession;
  customer: Customer | null;
  requiresCustomerRegistration: boolean;
  resumed: boolean;
}

export interface PlanFeatureLabel {
  key: string;
  label: string;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  featureLabels: PlanFeatureLabel[];
  limits: {
    maxTables: number | null;
    maxUsers: number | null;
    maxMenuItems: number | null;
  };
  trialDays: number;
  highlighted: boolean;
  active?: boolean;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: string;
  status: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
}

export interface AnalyticsOverview {
  range: { from: string; to: string };
  sales: { revenue: number; orders: number; averageTicket: number };
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topSongs: Array<{ title: string; youtubeId: string; requests: number }>;
  avgPreparationMinutes: number;
  busiestTables: Array<{ tableId: string; orders: number }>;
  peakHours: Array<{ hour: number; orders: number }>;
}
