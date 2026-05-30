/** Servicios / features incluidos en los planes de Bartender. */
export enum PlanFeature {
  QR_TABLES = 'qr_tables',
  REALTIME_ORDERS = 'realtime_orders',
  KITCHEN_DISPLAY = 'kitchen_display',
  BAR_DISPLAY = 'bar_display',
  /** @deprecated Usar MUSIC_YOUTUBE */
  MUSIC_SYSTEM = 'music_system',
  MUSIC_YOUTUBE = 'music_youtube',
  MUSIC_SPOTIFY = 'music_spotify',
  ANALYTICS = 'analytics',
  MULTI_USER = 'multi_user',
  CUSTOM_BRANDING = 'custom_branding',
  API_ACCESS = 'api_access',
  PRIORITY_SUPPORT = 'priority_support',
}

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  [PlanFeature.QR_TABLES]: 'Mesas con QR',
  [PlanFeature.REALTIME_ORDERS]: 'Pedidos en tiempo real',
  [PlanFeature.KITCHEN_DISPLAY]: 'Pantalla cocina (KDS)',
  [PlanFeature.BAR_DISPLAY]: 'Pantalla barra',
  [PlanFeature.MUSIC_SYSTEM]: 'Sistema de música social',
  [PlanFeature.MUSIC_YOUTUBE]: 'Música con YouTube',
  [PlanFeature.MUSIC_SPOTIFY]: 'Música con Spotify',
  [PlanFeature.ANALYTICS]: 'Analytics avanzado',
  [PlanFeature.MULTI_USER]: 'Multi-usuario y roles',
  [PlanFeature.CUSTOM_BRANDING]: 'Branding personalizado',
  [PlanFeature.API_ACCESS]: 'Acceso API',
  [PlanFeature.PRIORITY_SUPPORT]: 'Soporte prioritario',
};
