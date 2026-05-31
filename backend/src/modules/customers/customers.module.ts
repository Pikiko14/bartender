import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer.repository';
import { ManageCustomersUseCase } from './application/use-cases/manage-customers.use-case';
import { CustomersController } from './infrastructure/controllers/customers.controller';
import { CustomerMongoRepository } from './infrastructure/repositories/customer.mongo.repository';
import { CustomerModel, CustomerSchema } from './infrastructure/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CustomerModel.name, schema: CustomerSchema }]),
  ],
  controllers: [CustomersController],
  providers: [
    ManageCustomersUseCase,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerMongoRepository },
  ],
  exports: [CUSTOMER_REPOSITORY, ManageCustomersUseCase],
})
export class CustomersModule {}
