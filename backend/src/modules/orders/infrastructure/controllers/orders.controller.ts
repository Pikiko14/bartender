import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { OrderStatus, Permission } from '@shared/enums';
import { UpdateOrderStatusDto } from '../../application/dto/update-order-status.dto';
import { QueryOrdersUseCase } from '../../application/use-cases/query-orders.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';
import {
  CloseTableSessionUseCase,
  GetTableBillUseCase,
  ListOpenTableBillsUseCase,
} from '../../application/use-cases/table-bill.use-case';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly queryOrders: QueryOrdersUseCase,
    private readonly updateStatus: UpdateOrderStatusUseCase,
    private readonly getTableBill: GetTableBillUseCase,
    private readonly closeTableSession: CloseTableSessionUseCase,
    private readonly listOpenBills: ListOpenTableBillsUseCase,
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

  @Get('table-bills/open')
  @RequirePermissions(Permission.TABLE_VIEW, Permission.ORDER_VIEW)
  openTableBills(@CurrentUser('businessId') businessId: string) {
    return this.listOpenBills.execute(businessId);
  }

  @Get('table-bills/:tableSessionId')
  @RequirePermissions(Permission.TABLE_VIEW, Permission.ORDER_VIEW)
  tableBill(
    @CurrentUser('businessId') businessId: string,
    @Param('tableSessionId') tableSessionId: string,
  ) {
    return this.getTableBill.execute(businessId, tableSessionId);
  }

  @Post('table-bills/:tableSessionId/close')
  @RequirePermissions(Permission.TABLE_CLOSE)
  closeTable(
    @CurrentUser('businessId') businessId: string,
    @Param('tableSessionId') tableSessionId: string,
  ) {
    return this.closeTableSession.execute(businessId, tableSessionId);
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
