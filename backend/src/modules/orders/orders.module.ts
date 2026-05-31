import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '@modules/customers/customers.module';
import { MenuModule } from '@modules/menu/menu.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { TablesModule } from '@modules/tables/tables.module';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { QueryOrdersUseCase } from './application/use-cases/query-orders.use-case';
import { UpdateOrderStatusUseCase } from './application/use-cases/update-order-status.use-case';
import {
  AdoptOrphanOrdersUseCase,
  AssignTableSessionCustomerUseCase,
  CloseTableSessionUseCase,
  GetTableBillUseCase,
  ListOpenTableBillsUseCase,
  ListClosedTableBillsUseCase,
  OpenTableBillUseCase,
} from './application/use-cases/table-bill.use-case';
import { OrderTableEnricher } from './application/services/order-table.enricher';
import { OrderItemImageEnricher } from './application/services/order-item-image.enricher';
import { OrdersController } from './infrastructure/controllers/orders.controller';
import { PublicOrdersController } from './infrastructure/controllers/public-orders.controller';
import { OrderMongoRepository } from './infrastructure/repositories/order.mongo.repository';
import { OrderModel, OrderSchema } from './infrastructure/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrderModel.name, schema: OrderSchema }]),
    MenuModule,
    SessionsModule,
    TablesModule,
    CustomersModule,
  ],
  controllers: [OrdersController, PublicOrdersController],
  providers: [
    CreateOrderUseCase,
    QueryOrdersUseCase,
    UpdateOrderStatusUseCase,
    GetTableBillUseCase,
    CloseTableSessionUseCase,
    ListOpenTableBillsUseCase,
    ListClosedTableBillsUseCase,
    AdoptOrphanOrdersUseCase,
    OpenTableBillUseCase,
    AssignTableSessionCustomerUseCase,
    OrderTableEnricher,
    OrderItemImageEnricher,
    { provide: ORDER_REPOSITORY, useClass: OrderMongoRepository },
  ],
  exports: [ORDER_REPOSITORY],
})
export class OrdersModule {}
