import { Permission, Role } from '@shared/enums';
import { User } from '../../domain/entities/user.entity';
import { UserPermissionsService } from '../../domain/services/user-permissions.service';

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId: string | null;
  active: boolean;
  permissions: Permission[];
  createdAt?: Date;
}

const permissionsService = new UserPermissionsService();

export function presentUser(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    active: user.active,
    permissions: permissionsService.resolve(user),
    createdAt: user.createdAt,
  };
}
