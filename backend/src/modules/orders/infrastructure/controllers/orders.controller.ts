import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { OrderStatus, Permission } from '@shared/enums';
import { UpdateOrderStatusDto } from '../../application/dto/update-order-status.dto';
import { QueryOrdersUseCase } from '../../application/use-cases/query-orders.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly queryOrders: QueryOrdersUseCase,
    private readonly updateStatus: UpdateOrderStatusUseCase,
  ) {}

  @Get()
  @RequirePermissions(Permission.ORDER_VIEW)
  list(@CurrentUser('businessId') businessId: string, @Query('status') status?: OrderStatus) {
    return this.queryOrders.listByBusiness(businessId, status ? [status] : undefined);
  }

  @Get('kitchen')
  @RequirePermissions(Permission.KITCHEN_VIEW)
  kitchen(@CurrentUser('businessId') businessId: string) {
    return this.queryOrders.kitchenQueue(businessId);
  }

  @Get('bar')
  @RequirePermissions(Permission.BAR_VIEW)
  bar(@CurrentUser('businessId') businessId: string) {
    return this.queryOrders.barQueue(businessId);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.ORDER_UPDATE_STATUS)
  update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.updateStatus.execute(businessId, id, dto.status);
  }
}
