import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { OrderStatus, PreparationArea } from '@shared/enums';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { Order } from '../../domain/entities/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder, presentOrderForArea } from '../presenters/order.presenter';
import { OrderItemImageEnricher } from '../services/order-item-image.enricher';
import { OrderTableEnricher } from '../services/order-table.enricher';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly realtime: RealtimeService,
    private readonly tableEnricher: OrderTableEnricher,
    private readonly imageEnricher: OrderItemImageEnricher,
  ) {}

  async execute(businessId: string, orderId: string, status: OrderStatus) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new EntityNotFoundException('Pedido', orderId);
    if (order.businessId !== businessId) {
      throw new ForbiddenDomainException('El pedido no pertenece a tu negocio.');
    }

    order.changeStatus(status);
    const updated = await this.orders.update(order);
    await this.broadcastUpdated(updated);
    return this.presentFull(updated);
  }

  private async presentFull(order: Order) {
    return this.imageEnricher.enrichOne(await this.tableEnricher.enrichOne(presentOrder(order)));
  }

  private async presentArea(order: Order, area: PreparationArea) {
    return this.imageEnricher.enrichOne(
      await this.tableEnricher.enrichOne(presentOrderForArea(order, area)),
    );
  }

  private async broadcastUpdated(order: Order): Promise<void> {
    const view = await this.presentFull(order);
    this.realtime.emitToBusiness(order.businessId, SocketEvents.ORDER_UPDATED, view);
    this.realtime.emitToTable(order.tableId, SocketEvents.ORDER_UPDATED, view);
    if (order.areas.includes(PreparationArea.KITCHEN)) {
      this.realtime.emitToKitchen(
        order.businessId,
        SocketEvents.ORDER_UPDATED,
        await this.presentArea(order, PreparationArea.KITCHEN),
      );
    }
    if (order.areas.includes(PreparationArea.BAR)) {
      this.realtime.emitToBar(
        order.businessId,
        SocketEvents.ORDER_UPDATED,
        await this.presentArea(order, PreparationArea.BAR),
      );
    }
  }
}
