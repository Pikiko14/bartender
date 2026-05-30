import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { BusinessRuleViolationException, ForbiddenDomainException } from '@core/domain/exceptions';
import { OrderStatus, PreparationArea } from '@shared/enums';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RedisService } from '@infrastructure/redis/redis.service';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import {
  MENU_ITEM_REPOSITORY,
  MenuItemRepository,
} from '@modules/menu/domain/repositories/menu.repository';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import {
  TABLE_SESSION_REPOSITORY,
  TableSessionRepository,
} from '@modules/tables/domain/repositories/table-session.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/value-objects/order-item.vo';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { CreateOrderDto } from '../dto/create-order.dto';
import { presentOrder, presentOrderForArea } from '../presenters/order.presenter';
import { OrderTableEnricher } from '../services/order-table.enricher';

@Injectable()
export class CreateOrderUseCase {
  // Anti-flood: máximo de pedidos por sesión en una ventana.
  private readonly floodLimit = 5;
  private readonly floodWindowSeconds = 60;

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItems: MenuItemRepository,
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    private readonly sessions: GuestSessionService,
    private readonly realtime: RealtimeService,
    private readonly redis: RedisService,
    private readonly tableEnricher: OrderTableEnricher,
  ) {}

  async execute(dto: CreateOrderDto) {
    const session = await this.sessions.get(dto.sessionId);
    const tableSession = await this.tableSessions.findById(session.tableSessionId);
    if (!tableSession?.isOpen()) {
      throw new BusinessRuleViolationException(
        'La mesa está cerrada. Escanea el QR de nuevo para abrir una nueva cuenta.',
      );
    }
    await this.assertNotFlooding(dto.sessionId);

    const requestedIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.menuItems.findManyByIds(requestedIds);
    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    const orderItems: OrderItem[] = dto.items.map((line) => {
      const menuItem = itemMap.get(line.menuItemId);
      if (!menuItem || menuItem.businessId !== session.businessId) {
        throw new BusinessRuleViolationException(
          `Producto ${line.menuItemId} no disponible en este negocio.`,
        );
      }
      if (!menuItem.canOrder(line.quantity)) {
        throw new BusinessRuleViolationException(`"${menuItem.name}" no tiene stock suficiente.`);
      }
      return new OrderItem({
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice: menuItem.price,
        quantity: line.quantity,
        preparationArea: menuItem.preparationArea,
        notes: line.notes ?? null,
        image: menuItem.toPrimitives().image,
      });
    });

    const order = new Order({
      id: uuid(),
      businessId: session.businessId,
      tableId: session.tableId,
      sessionId: session.sessionId,
      tableSessionId: session.tableSessionId,
      items: orderItems,
      status: OrderStatus.PENDING,
      notes: dto.notes ?? null,
    });

    const created = await this.orders.create(order);
    await this.broadcastCreated(created);
    return this.tableEnricher.enrichOne(presentOrder(created));
  }

  private async broadcastCreated(order: Order): Promise<void> {
    const view = await this.tableEnricher.enrichOne(presentOrder(order));
    this.realtime.emitToBusiness(order.businessId, SocketEvents.ORDER_CREATED, view);
    this.realtime.emitToTable(order.tableId, SocketEvents.ORDER_CREATED, view);

    if (order.areas.includes(PreparationArea.KITCHEN)) {
      this.realtime.emitToKitchen(
        order.businessId,
        SocketEvents.KITCHEN_ORDER_CREATED,
        await this.tableEnricher.enrichOne(presentOrderForArea(order, PreparationArea.KITCHEN)),
      );
    }
    if (order.areas.includes(PreparationArea.BAR)) {
      this.realtime.emitToBar(
        order.businessId,
        SocketEvents.BAR_ORDER_CREATED,
        await this.tableEnricher.enrichOne(presentOrderForArea(order, PreparationArea.BAR)),
      );
    }
  }

  private async assertNotFlooding(sessionId: string): Promise<void> {
    const key = `flood:order:${sessionId}`;
    const count = await this.redis.incrementWithTtl(key, this.floodWindowSeconds);
    if (count > this.floodLimit) {
      throw new ForbiddenDomainException(
        'Demasiados pedidos en poco tiempo. Espera un momento antes de volver a pedir.',
      );
    }
  }
}
