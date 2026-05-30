import { Injectable } from '@nestjs/common';
import { Permission, resolvePermissionsForRole } from '@shared/enums';
import { User } from '../entities/user.entity';

/**
 * Calcula los permisos efectivos de un usuario:
 *   (permisos del rol ∪ extra) − revocados
 */
@Injectable()
export class UserPermissionsService {
  resolve(user: User): Permission[] {
    const base = new Set<Permission>(resolvePermissionsForRole(user.role));
    for (const p of user.extraPermissions) base.add(p);
    for (const p of user.revokedPermissions) base.delete(p);
    return Array.from(base);
  }
}
