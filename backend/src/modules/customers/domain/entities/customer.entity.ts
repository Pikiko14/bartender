export interface CustomerProps {
  id: string;
  businessId: string;
  name: string;
  document: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Customer {
  constructor(private props: CustomerProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get name(): string {
    return this.props.name;
  }
  get document(): string {
    return this.props.document;
  }
  get phone(): string | null {
    return this.props.phone ?? null;
  }
  get email(): string | null {
    return this.props.email ?? null;
  }
  get notes(): string | null {
    return this.props.notes ?? null;
  }

  updateProfile(partial: { name?: string; phone?: string | null; email?: string | null }): void {
    if (partial.name !== undefined) this.props.name = partial.name.trim();
    if (partial.phone !== undefined) this.props.phone = partial.phone?.trim() || null;
    if (partial.email !== undefined) {
      this.props.email = partial.email?.trim().toLowerCase() || null;
    }
  }

  toPrimitives(): CustomerProps {
    return { ...this.props };
  }
}
