import { Inject, Injectable } from '@nestjs/common';
import { ACTIVE_ORDER_STATUSES, OrderStatus, PreparationArea } from '@shared/enums';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder, presentOrderForArea } from '../presenters/order.presenter';

@Injectable()
export class QueryOrdersUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  async listByBusiness(businessId: string, statuses?: OrderStatus[]) {
    const orders = await this.orders.find({ businessId, statuses });
    return orders.map(presentOrder).reverse();
  }

  /** Kitchen Display System: pedidos activos con líneas de cocina. */
  async kitchenQueue(businessId: string) {
    const orders = await this.orders.find({
      businessId,
      area: PreparationArea.KITCHEN,
      statuses: ACTIVE_ORDER_STATUSES,
    });
    return orders.map((o) => presentOrderForArea(o, PreparationArea.KITCHEN));
  }

  /** Bar Display: pedidos activos con líneas de barra. */
  async barQueue(businessId: string) {
    const orders = await this.orders.find({
      businessId,
      area: PreparationArea.BAR,
      statuses: ACTIVE_ORDER_STATUSES,
    });
    return orders.map((o) => presentOrderForArea(o, PreparationArea.BAR));
  }

  async listBySession(businessId: string, sessionId: string) {
    const orders = await this.orders.find({ businessId, sessionId });
    return orders.map(presentOrder);
  }
}
