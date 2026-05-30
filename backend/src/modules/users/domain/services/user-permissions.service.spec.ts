import { Permission, Role } from '@shared/enums';
import { User } from '../entities/user.entity';
import { UserPermissionsService } from './user-permissions.service';

const buildUser = (role: Role, extra: Permission[] = [], revoked: Permission[] = []) =>
  new User({
    id: 'u1',
    name: 'Test',
    email: 't@t.com',
    passwordHash: 'x',
    role,
    businessId: 'b1',
    active: true,
    extraPermissions: extra,
    revokedPermissions: revoked,
  });

describe('UserPermissionsService', () => {
  const service = new UserPermissionsService();

  it('OWNER tiene todos los permisos', () => {
    const perms = service.resolve(buildUser(Role.OWNER));
    expect(perms).toContain(Permission.BUSINESS_MANAGE);
    expect(perms).toContain(Permission.ANALYTICS_VIEW);
  });

  it('aplica permisos extra y revocados', () => {
    const perms = service.resolve(
      buildUser(Role.WAITER, [Permission.MUSIC_MODERATE], [Permission.ORDER_CREATE]),
    );
    expect(perms).toContain(Permission.MUSIC_MODERATE);
    expect(perms).not.toContain(Permission.ORDER_CREATE);
  });

  it('KITCHEN solo ve cocina y pedidos', () => {
    const perms = service.resolve(buildUser(Role.KITCHEN));
    expect(perms).toContain(Permission.KITCHEN_VIEW);
    expect(perms).not.toContain(Permission.MENU_MANAGE);
  });
});
