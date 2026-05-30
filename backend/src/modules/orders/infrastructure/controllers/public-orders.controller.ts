import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@shared/decorators';
import { GuestSessionService } from '@modules/sessions/application/guest-session.service';
import { CreateOrderDto } from '../../application/dto/create-order.dto';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { QueryOrdersUseCase } from '../../application/use-cases/query-orders.use-case';

@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly queryOrders: QueryOrdersUseCase,
    private readonly sessions: GuestSessionService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.createOrder.execute(dto);
  }

  /** Tracking realtime del cliente: pedidos de su sesión. */
  @Get('session/:sessionId')
  async bySession(@Param('sessionId') sessionId: string) {
    const session = await this.sessions.get(sessionId);
    return this.queryOrders.listBySession(session.businessId, sessionId);
  }
}
