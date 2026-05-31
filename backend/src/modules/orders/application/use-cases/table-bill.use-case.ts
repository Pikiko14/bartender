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
  TABLE_REPOSITORY,
  TableRepository,
} from '@modules/tables/domain/repositories/table.repository';
import {
  TABLE_SESSION_REPOSITORY,
  TableSessionRepository,
} from '@modules/tables/domain/repositories/table-session.repository';
import { TableSession } from '@modules/tables/domain/entities/table-session.entity';
import { presentTableSession } from '@modules/tables/application/presenters/table-session.presenter';
import { OpenTableSessionUseCase } from '@modules/tables/application/use-cases/open-table-session.use-case';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '@modules/customers/domain/repositories/customer.repository';
import { presentCustomer, CustomerView } from '@modules/customers/application/presenters/customer.presenter';
import { ManageCustomersUseCase } from '@modules/customers/application/use-cases/manage-customers.use-case';
import { AssignTableBillCustomerDto } from '../dto/assign-table-bill-customer.dto';
import { ORDER_REPOSITORY, OrderRepository } from '../../domain/repositories/order.repository';
import { presentOrder, OrderView } from '../presenters/order.presenter';
import { OrderTableEnricher } from '../services/order-table.enricher';
import { OrderItemImageEnricher } from '../services/order-item-image.enricher';
import { Order } from '../../domain/entities/order.entity';

export interface TableBillLineView {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image: string | null;
}

export interface TableBillView {
  tableSession: ReturnType<typeof presentTableSession> | null;
  tableId: string;
  tableName?: string;
  tableNumber?: number;
  customer: CustomerView | null;
  orders: OrderView[];
  lines: TableBillLineView[];
  orderCount: number;
  total: number;
  hasActiveSession: boolean;
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
    @Inject(TABLE_REPOSITORY) private readonly tables: TableRepository,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
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
    return this.buildBill(businessId, tableSession);
  }

  async buildForTable(businessId: string, tableId: string): Promise<TableBillView> {
    const open = await this.tableSessions.findOpenByTable(businessId, tableId);
    if (open) return this.buildBill(businessId, open);

    const orders = await this.orders.find({
      businessId,
      tableId,
      statuses: BILL_STATUSES,
      missingTableSession: true,
    });
    const table = await this.tables.findById(tableId);
    return this.composeBill(null, table?.id ?? tableId, table?.name, table?.number, null, orders, businessId);
  }

  private async buildBill(businessId: string, tableSession: TableSession): Promise<TableBillView> {
    const bySession = await this.orders.find({
      businessId,
      tableSessionId: tableSession.id,
      statuses: BILL_STATUSES,
    });
    const orphans = await this.orders.find({
      businessId,
      tableId: tableSession.tableId,
      statuses: BILL_STATUSES,
      missingTableSession: true,
    });

    const orderMap = new Map<string, Order>();
    for (const o of [...bySession, ...orphans]) orderMap.set(o.id, o);

    let customer: CustomerView | null = null;
    if (tableSession.customerId) {
      const c = await this.customers.findById(tableSession.customerId);
      if (c) customer = presentCustomer(c);
    }

    const table = await this.tables.findById(tableSession.tableId);
    return this.composeBill(
      tableSession,
      tableSession.tableId,
      table?.name,
      table?.number,
      customer,
      [...orderMap.values()],
      businessId,
    );
  }

  private async composeBill(
    tableSession: TableSession | null,
    tableId: string,
    tableName: string | undefined,
    tableNumber: number | undefined,
    customer: CustomerView | null,
    orders: Order[],
    businessId: string,
  ): Promise<TableBillView> {
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
      tableSession: tableSession ? presentTableSession(tableSession) : null,
      tableId,
      tableName: tableMeta?.tableName ?? tableName,
      tableNumber: tableMeta?.tableNumber ?? tableNumber,
      customer,
      orders: enriched,
      lines,
      orderCount: enriched.length,
      total,
      hasActiveSession: tableSession?.isOpen() ?? false,
    };
  }
}

@Injectable()
export class AdoptOrphanOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  async execute(businessId: string, tableId: string, tableSessionId: string) {
    const orphans = await this.orders.find({
      businessId,
      tableId,
      statuses: BILL_STATUSES,
      missingTableSession: true,
    });
    for (const order of orphans) {
      order.assignTableSession(tableSessionId);
      await this.orders.update(order);
    }
    return orphans.length;
  }
}

@Injectable()
export class OpenTableBillUseCase {
  constructor(
    private readonly openSession: OpenTableSessionUseCase,
    private readonly adoptOrphans: AdoptOrphanOrdersUseCase,
    private readonly getBill: GetTableBillUseCase,
  ) {}

  async execute(businessId: string, tableId: string) {
    const sessionView = await this.openSession.execute(businessId, tableId);
    await this.adoptOrphans.execute(businessId, tableId, sessionView.id);
    return this.getBill.execute(businessId, sessionView.id);
  }
}

@Injectable()
export class CloseTableSessionUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    private readonly getBill: GetTableBillUseCase,
    private readonly adoptOrphans: AdoptOrphanOrdersUseCase,
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

    await this.adoptOrphans.execute(businessId, tableSession.tableId, tableSessionId);
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
export class AssignTableSessionCustomerUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
    private readonly manageCustomers: ManageCustomersUseCase,
    private readonly openBill: OpenTableBillUseCase,
    private readonly getBill: GetTableBillUseCase,
  ) {}

  async execute(businessId: string, tableSessionId: string | null, tableId: string, dto: AssignTableBillCustomerDto) {
    let sessionId = tableSessionId;
    if (!sessionId) {
      const bill = await this.openBill.execute(businessId, tableId);
      sessionId = bill.tableSession!.id;
    }

    const tableSession = await this.tableSessions.findById(sessionId);
    if (!tableSession) throw new EntityNotFoundException('Sesión de mesa', sessionId);
    if (tableSession.businessId !== businessId) {
      throw new ForbiddenDomainException('La sesión no pertenece a tu negocio.');
    }

    let customerId: string | null = dto.customerId ?? null;

    if (dto.create) {
      const created = await this.manageCustomers.create(businessId, dto.create);
      customerId = created.id;
    } else if (customerId) {
      const customer = await this.customers.findById(customerId);
      if (!customer || customer.businessId !== businessId) {
        throw new EntityNotFoundException('Cliente', customerId);
      }
    }

    tableSession.assignCustomer(customerId);
    await this.tableSessions.update(tableSession);

    return this.getBill.execute(businessId, sessionId);
  }
}

@Injectable()
export class ListOpenTableBillsUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly getBill: GetTableBillUseCase,
  ) {}

  async execute(businessId: string) {
    const open = await this.tableSessions.findOpenByBusiness(businessId);
    const openTableIds = new Set(open.map((s) => s.tableId));
    const bills = await Promise.all(open.map((s) => this.getBill.execute(businessId, s.id)));

    const orphans = await this.orders.find({
      businessId,
      statuses: BILL_STATUSES,
      missingTableSession: true,
    });

    const orphanByTable = new Map<string, Order[]>();
    for (const order of orphans) {
      if (openTableIds.has(order.tableId)) continue;
      const list = orphanByTable.get(order.tableId) ?? [];
      list.push(order);
      orphanByTable.set(order.tableId, list);
    }

    for (const [tableId] of orphanByTable) {
      bills.push(await this.getBill.buildForTable(businessId, tableId));
    }

    return bills.sort((a, b) => {
      const na = a.tableNumber ?? 9999;
      const nb = b.tableNumber ?? 9999;
      return na - nb || (a.tableName ?? '').localeCompare(b.tableName ?? '');
    });
  }
}

@Injectable()
export class ListClosedTableBillsUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    private readonly getBill: GetTableBillUseCase,
  ) {}

  async execute(businessId: string, limit = 50) {
    const closed = await this.tableSessions.findClosedByBusiness(businessId, limit);
    return Promise.all(closed.map((s) => this.getBill.execute(businessId, s.id)));
  }
}
