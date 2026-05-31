import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { CreateCustomerDto } from '../../application/dto/create-customer.dto';
import { ManageCustomersUseCase } from '../../application/use-cases/manage-customers.use-case';

@Controller('customers')
export class CustomersController {
  constructor(private readonly manageCustomers: ManageCustomersUseCase) {}

  @Get()
  @RequirePermissions(Permission.ORDER_VIEW)
  list(@CurrentUser('businessId') businessId: string, @Query('q') q?: string) {
    return this.manageCustomers.list(businessId, q);
  }

  @Post()
  @RequirePermissions(Permission.ORDER_VIEW)
  create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateCustomerDto) {
    return this.manageCustomers.create(businessId, dto);
  }
}
