import { BusinessRuleViolationException } from '@core/domain/exceptions';
import { ORDER_TRANSITIONS, OrderStatus, PreparationArea } from '@shared/enums';
import { OrderItem } from '../value-objects/order-item.vo';

export interface OrderProps {
  id: string;
  businessId: string;
  tableId: string;
  sessionId: string;
  items: OrderItem[];
  status: OrderStatus;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Order {
  constructor(private props: OrderProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get tableId(): string {
    return this.props.tableId;
  }
  get sessionId(): string {
    return this.props.sessionId;
  }
  get items(): OrderItem[] {
    return this.props.items;
  }
  get status(): OrderStatus {
    return this.props.status;
  }
  get notes(): string | null {
    return this.props.notes ?? null;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get total(): number {
    return Math.round(this.props.items.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
  }

  /** Áreas de preparación implicadas en el pedido (cocina/barra). */
  get areas(): PreparationArea[] {
    return Array.from(new Set(this.props.items.map((i) => i.preparationArea)));
  }

  itemsForArea(area: PreparationArea): OrderItem[] {
    return this.props.items.filter((i) => i.preparationArea === area);
  }

  changeStatus(next: OrderStatus): void {
    const allowed = ORDER_TRANSITIONS[this.props.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BusinessRuleViolationException(
        `Transición de estado inválida: ${this.props.status} -> ${next}.`,
      );
    }
    this.props.status = next;
  }

  toPrimitives() {
    return {
      ...this.props,
      total: this.total,
      areas: this.areas,
      items: this.props.items.map((i) => i.toPrimitives()),
    };
  }
}
