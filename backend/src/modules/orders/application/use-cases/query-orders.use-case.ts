import { Inject, Injectable } from '@nestjs/common';
import { ACTIVE_ORDER_STATUSES, OrderStatus, PreparationArea } from '@shared/enums';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder, presentOrderForArea } from '../presenters/order.presenter';
import { OrderItemImageEnricher } from '../services/order-item-image.enricher';
import { OrderTableEnricher } from '../services/order-table.enricher';

@Injectable()
export class QueryOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly tableEnricher: OrderTableEnricher,
    private readonly imageEnricher: OrderItemImageEnricher,
  ) {}

  private async enrichViews(views: Awaited<ReturnType<typeof presentOrder>>[], businessId: string) {
    const withTables = await this.tableEnricher.enrichMany(views, businessId);
    return this.imageEnricher.enrichMany(withTables);
  }

  async listByBusiness(businessId: string, statuses?: OrderStatus[]) {
    const orders = await this.orders.find({ businessId, statuses });
    const views = orders.map(presentOrder).reverse();
    return this.enrichViews(views, businessId);
  }

  /** Kitchen Display System: pedidos activos con líneas de cocina. */
  async kitchenQueue(businessId: string) {
    const orders = await this.orders.find({
      businessId,
      area: PreparationArea.KITCHEN,
      statuses: ACTIVE_ORDER_STATUSES,
    });
    const views = orders
      .map((o) => presentOrderForArea(o, PreparationArea.KITCHEN))
      .filter((o) => o.items.length > 0);
    return this.enrichViews(views, businessId);
  }

  /** Bar Display: pedidos activos con líneas de barra. */
  async barQueue(businessId: string) {
    const orders = await this.orders.find({
      businessId,
      area: PreparationArea.BAR,
      statuses: ACTIVE_ORDER_STATUSES,
    });
    const views = orders
      .map((o) => presentOrderForArea(o, PreparationArea.BAR))
      .filter((o) => o.items.length > 0);
    return this.enrichViews(views, businessId);
  }

  async listBySession(businessId: string, sessionId: string) {
    const orders = await this.orders.find({ businessId, sessionId });
    const views = orders.map(presentOrder);
    return this.enrichViews(views, businessId);
  }

  /** Pedidos de la cuenta abierta de la mesa (todos los comensales). */
  async listByTableSession(businessId: string, tableSessionId: string) {
    const orders = await this.orders.find({ businessId, tableSessionId });
    const views = orders.map(presentOrder);
    return this.enrichViews(views, businessId);
  }
}
