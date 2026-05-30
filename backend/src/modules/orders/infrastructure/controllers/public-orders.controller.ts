import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@shared/decorators';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import { OpenTableSessionUseCase } from '@modules/tables/application/use-cases/open-table-session.use-case';
import { CreateOrderDto } from '../../application/dto/create-order.dto';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { QueryOrdersUseCase } from '../../application/use-cases/query-orders.use-case';
import { GetTableBillUseCase } from '../../application/use-cases/table-bill.use-case';

@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly queryOrders: QueryOrdersUseCase,
    private readonly getTableBill: GetTableBillUseCase,
    private readonly sessions: GuestSessionService,
    private readonly openTableSession: OpenTableSessionUseCase,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.createOrder.execute(dto);
  }

  /** Tracking del cliente: pedidos de su sesión guest. */
  @Get('session/:sessionId')
  async bySession(@Param('sessionId') sessionId: string) {
    const session = await this.sessions.get(sessionId);
    return this.queryOrders.listBySession(session.businessId, sessionId);
  }

  /** Cuenta consolidada de la mesa (todos los pedidos del tab abierto). */
  @Get('table-session/:sessionId/bill')
  async tableBill(@Param('sessionId') sessionId: string) {
    const session = await this.sessions.get(sessionId);
    const tableSession = await this.openTableSession.getById(session.tableSessionId);
    if (!tableSession || tableSession.status !== 'open') {
      return {
        tableSession: tableSession ?? null,
        tableId: session.tableId,
        orders: [],
        lines: [],
        orderCount: 0,
        total: 0,
        closed: true,
      };
    }
    const bill = await this.getTableBill.execute(session.businessId, session.tableSessionId);
    return { ...bill, closed: false };
  }

  /** Pedidos de la cuenta abierta de la mesa. */
  @Get('table-session/:sessionId')
  async byTableSession(@Param('sessionId') sessionId: string) {
    const session = await this.sessions.get(sessionId);
    const tableSession = await this.openTableSession.getById(session.tableSessionId);
    if (!tableSession || tableSession.status !== 'open') return [];
    return this.queryOrders.listByTableSession(session.businessId, session.tableSessionId);
  }
}
