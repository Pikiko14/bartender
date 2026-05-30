import { OrderStatus, PreparationArea } from '@shared/enums';
import { Order } from '../entities/order.entity';

export interface OrderFilter {
  businessId: string;
  statuses?: OrderStatus[];
  area?: PreparationArea;
  tableId?: string;
  sessionId?: string;
  tableSessionId?: string;
  from?: Date;
  to?: Date;
}

export abstract class OrderRepository {
  abstract create(order: Order): Promise<Order>;
  abstract findById(id: string): Promise<Order | null>;
  abstract find(filter: OrderFilter): Promise<Order[]>;
  abstract update(order: Order): Promise<Order>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
