import { Role } from './role.enum';

/**
 * Permisos granulares del sistema. Los roles se mapean a un conjunto de
 * permisos por defecto, pero un usuario puede tener permisos extra/quitados.
 */
export enum Permission {
  // Business
  BUSINESS_MANAGE = 'business:manage',
  BUSINESS_VIEW = 'business:view',

  // Users
  USER_MANAGE = 'user:manage',
  USER_VIEW = 'user:view',

  // Menu
  MENU_MANAGE = 'menu:manage',
  MENU_VIEW = 'menu:view',

  // Tables
  TABLE_MANAGE = 'table:manage',
  TABLE_VIEW = 'table:view',

  // Orders
  ORDER_CREATE = 'order:create',
  ORDER_VIEW = 'order:view',
  ORDER_UPDATE_STATUS = 'order:update_status',
  ORDER_CANCEL = 'order:cancel',

  // Kitchen / Bar displays
  KITCHEN_VIEW = 'kitchen:view',
  BAR_VIEW = 'bar:view',

  // Music
  MUSIC_REQUEST = 'music:request',
  MUSIC_MODERATE = 'music:moderate',
  MUSIC_PLAYBACK = 'music:playback',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.BUSINESS_VIEW,
    Permission.USER_MANAGE,
    Permission.USER_VIEW,
    Permission.MENU_MANAGE,
    Permission.MENU_VIEW,
    Permission.TABLE_MANAGE,
    Permission.TABLE_VIEW,
    Permission.ORDER_VIEW,
    Permission.ORDER_UPDATE_STATUS,
    Permission.ORDER_CANCEL,
    Permission.KITCHEN_VIEW,
    Permission.BAR_VIEW,
    Permission.MUSIC_MODERATE,
    Permission.MUSIC_PLAYBACK,
    Permission.ANALYTICS_VIEW,
  ],
  [Role.WAITER]: [
    Permission.MENU_VIEW,
    Permission.TABLE_VIEW,
    Permission.ORDER_CREATE,
    Permission.ORDER_VIEW,
    Permission.ORDER_UPDATE_STATUS,
  ],
  [Role.DJ]: [Permission.MUSIC_MODERATE, Permission.MUSIC_PLAYBACK],
  [Role.CASHIER]: [
    Permission.ORDER_VIEW,
    Permission.ORDER_UPDATE_STATUS,
    Permission.MENU_VIEW,
    Permission.TABLE_VIEW,
  ],
  [Role.KITCHEN]: [Permission.KITCHEN_VIEW, Permission.ORDER_VIEW, Permission.ORDER_UPDATE_STATUS],
  [Role.BAR]: [Permission.BAR_VIEW, Permission.ORDER_VIEW, Permission.ORDER_UPDATE_STATUS],
};

export function resolvePermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
