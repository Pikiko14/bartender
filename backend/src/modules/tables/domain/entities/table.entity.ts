export interface TableProps {
  id: string;
  businessId: string;
  number: number;
  name: string;
  slug: string;
  qrUrl: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Table {
  constructor(private props: TableProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get number(): number {
    return this.props.number;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get qrUrl(): string {
    return this.props.qrUrl;
  }
  get active(): boolean {
    return this.props.active;
  }

  update(partial: Partial<Pick<TableProps, 'name' | 'number' | 'active'>>): void {
    Object.assign(this.props, partial);
  }

  toPrimitives(): TableProps {
    return { ...this.props };
  }
}
