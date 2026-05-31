import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { OrderStatus, Permission } from '@shared/enums';
import { AssignTableBillCustomerDto } from '../../application/dto/assign-table-bill-customer.dto';
import { UpdateOrderStatusDto } from '../../application/dto/update-order-status.dto';
import { QueryOrdersUseCase } from '../../application/use-cases/query-orders.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/update-order-status.use-case';
import {
  AssignTableSessionCustomerUseCase,
  CloseTableSessionUseCase,
  GetTableBillUseCase,
  ListOpenTableBillsUseCase,
  ListClosedTableBillsUseCase,
  OpenTableBillUseCase,
} from '../../application/use-cases/table-bill.use-case';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly queryOrders: QueryOrdersUseCase,
    private readonly updateStatus: UpdateOrderStatusUseCase,
    private readonly getTableBill: GetTableBillUseCase,
    private readonly closeTableSession: CloseTableSessionUseCase,
    private readonly listOpenBills: ListOpenTableBillsUseCase,
    private readonly listClosedBills: ListClosedTableBillsUseCase,
    private readonly openTableBill: OpenTableBillUseCase,
    private readonly assignCustomer: AssignTableSessionCustomerUseCase,
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

  @Get('table-bills/closed')
  @RequirePermissions(Permission.TABLE_VIEW, Permission.ORDER_VIEW)
  closedTableBills(
    @CurrentUser('businessId') businessId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50;
    return this.listClosedBills.execute(businessId, n);
  }

  @Get('table-bills/:tableSessionId')
  @RequirePermissions(Permission.TABLE_VIEW, Permission.ORDER_VIEW)
  tableBill(
    @CurrentUser('businessId') businessId: string,
    @Param('tableSessionId') tableSessionId: string,
  ) {
    return this.getTableBill.execute(businessId, tableSessionId);
  }

  @Post('table-bills/for-table/:tableId/open')
  @RequirePermissions(Permission.TABLE_CLOSE, Permission.ORDER_VIEW)
  openForTable(
    @CurrentUser('businessId') businessId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.openTableBill.execute(businessId, tableId);
  }

  @Patch('table-bills/customer')
  @RequirePermissions(Permission.TABLE_CLOSE, Permission.ORDER_VIEW)
  assignTableCustomer(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: AssignTableBillCustomerDto,
  ) {
    return this.assignCustomer.execute(
      businessId,
      dto.tableSessionId ?? null,
      dto.tableId,
      dto,
    );
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
