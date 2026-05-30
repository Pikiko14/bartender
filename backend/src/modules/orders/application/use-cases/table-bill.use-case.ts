import { Inject, Injectable } from '@nestjs/common';
import {
  EntityNotFoundException,
  ForbiddenDomainException,
  BusinessRuleViolationException,
} from '@core/domain/exceptions';
import { OrderStatus } from '@shared/enums';
import { SocketEvents } from '@shared/realtime/socket-events';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import {
  TABLE_SESSION_REPOSITORY,
  TableSessionRepository,
} from '@modules/tables/domain/repositories/table-session.repository';
import { presentTableSession } from '@modules/tables/application/presenters/table-session.presenter';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder } from '../presenters/order.presenter';
import { OrderTableEnricher } from '../services/order-table.enricher';
import { OrderItemImageEnricher } from '../services/order-item-image.enricher';

export interface TableBillLineView {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image: string | null;
}

export interface TableBillView {
  tableSession: ReturnType<typeof presentTableSession>;
  tableId: string;
  tableName?: string;
  tableNumber?: number;
  orders: Awaited<ReturnType<OrderTableEnricher['enrichMany']>>;
  lines: TableBillLineView[];
  orderCount: number;
  total: number;
}

const BILL_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
];

@Injectable()
export class GetTableBillUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly tableEnricher: OrderTableEnricher,
    private readonly imageEnricher: OrderItemImageEnricher,
  ) {}

  async execute(businessId: string, tableSessionId: string): Promise<TableBillView> {
    const tableSession = await this.tableSessions.findById(tableSessionId);
    if (!tableSession) throw new EntityNotFoundException('Sesión de mesa', tableSessionId);
    if (tableSession.businessId !== businessId) {
      throw new ForbiddenDomainException('La sesión no pertenece a tu negocio.');
    }

    const orders = await this.orders.find({
      businessId,
      tableSessionId,
      statuses: BILL_STATUSES,
    });

    const views = orders.map(presentOrder);
    const enriched = await this.imageEnricher.enrichMany(
      await this.tableEnricher.enrichMany(views, businessId),
    );

    const lineMap = new Map<string, TableBillLineView>();
    for (const order of enriched) {
      for (const item of order.items) {
        const key = item.menuItemId;
        const prev = lineMap.get(key);
        if (prev) {
          prev.quantity += item.quantity;
          prev.subtotal = Math.round((prev.subtotal + item.subtotal) * 100) / 100;
        } else {
          lineMap.set(key, {
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            image: item.image,
          });
        }
      }
    }

    const lines = [...lineMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    const total = Math.round(lines.reduce((acc, l) => acc + l.subtotal, 0) * 100) / 100;
    const tableMeta = enriched[0];

    return {
      tableSession: presentTableSession(tableSession),
      tableId: tableSession.tableId,
      tableName: tableMeta?.tableName,
      tableNumber: tableMeta?.tableNumber,
      orders: enriched,
      lines,
      orderCount: enriched.length,
      total,
    };
  }
}

@Injectable()
export class CloseTableSessionUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    private readonly getBill: GetTableBillUseCase,
    private readonly realtime: RealtimeService,
  ) {}

  async execute(businessId: string, tableSessionId: string) {
    const tableSession = await this.tableSessions.findById(tableSessionId);
    if (!tableSession) throw new EntityNotFoundException('Sesión de mesa', tableSessionId);
    if (tableSession.businessId !== businessId) {
      throw new ForbiddenDomainException('La sesión no pertenece a tu negocio.');
    }
    if (!tableSession.isOpen()) {
      throw new BusinessRuleViolationException('La mesa ya está cerrada.');
    }

    const bill = await this.getBill.execute(businessId, tableSessionId);
    tableSession.close();
    await this.tableSessions.update(tableSession);

    this.realtime.emitToBusiness(businessId, SocketEvents.TABLE_SESSION_CLOSED, {
      tableSessionId,
      tableId: tableSession.tableId,
    });
    this.realtime.emitToTable(tableSession.tableId, SocketEvents.TABLE_SESSION_CLOSED, {
      tableSessionId,
      tableId: tableSession.tableId,
    });

    return bill;
  }
}

@Injectable()
export class ListOpenTableBillsUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    private readonly getBill: GetTableBillUseCase,
  ) {}

  async execute(businessId: string) {
    const open = await this.tableSessions.findOpenByBusiness(businessId);
    return Promise.all(open.map((s) => this.getBill.execute(businessId, s.id)));
  }
}
