import { Permission, Role } from '@shared/enums';

export interface UserProps {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  businessId: string | null;
  active: boolean;
  extraPermissions: Permission[];
  revokedPermissions: Permission[];
  createdAt?: Date;
  updatedAt?: Date;
}

/** Entidad de dominio User. Independiente de Mongoose. */
export class User {
  constructor(private props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get role(): Role {
    return this.props.role;
  }
  get businessId(): string | null {
    return this.props.businessId;
  }
  get active(): boolean {
    return this.props.active;
  }
  get extraPermissions(): Permission[] {
    return this.props.extraPermissions ?? [];
  }
  get revokedPermissions(): Permission[] {
    return this.props.revokedPermissions ?? [];
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  assignBusiness(businessId: string): void {
    this.props.businessId = businessId;
  }

  changeRole(role: Role): void {
    this.props.role = role;
  }

  deactivate(): void {
    this.props.active = false;
  }

  activate(): void {
    this.props.active = true;
  }

  setPasswordHash(hash: string): void {
    this.props.passwordHash = hash;
  }

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}
