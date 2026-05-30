import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { OrderStatus, PreparationArea } from '@shared/enums';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { Order } from '../../domain/entities/order.entity';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder } from '../presenters/order.presenter';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async execute(businessId: string, orderId: string, status: OrderStatus) {
    const order = await this.orders.findById(orderId);
    if (!order) throw new EntityNotFoundException('Pedido', orderId);
    if (order.businessId !== businessId) {
      throw new ForbiddenDomainException('El pedido no pertenece a tu negocio.');
    }

    order.changeStatus(status);
    const updated = await this.orders.update(order);
    this.broadcastUpdated(updated);
    return presentOrder(updated);
  }

  private broadcastUpdated(order: Order): void {
    const view = presentOrder(order);
    this.realtime.emitToBusiness(order.businessId, SocketEvents.ORDER_UPDATED, view);
    this.realtime.emitToTable(order.tableId, SocketEvents.ORDER_UPDATED, view);
    if (order.areas.includes(PreparationArea.KITCHEN)) {
      this.realtime.emitToKitchen(order.businessId, SocketEvents.ORDER_UPDATED, view);
    }
    if (order.areas.includes(PreparationArea.BAR)) {
      this.realtime.emitToBar(order.businessId, SocketEvents.ORDER_UPDATED, view);
    }
  }
}
