import { Permission, Role } from '../enums';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  businessId: string | null;
  permissions: Permission[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  businessId: string | null;
  permissions: Permission[];
  type: 'access' | 'refresh';
}
