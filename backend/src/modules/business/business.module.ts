import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '@modules/users/users.module';
import { BUSINESS_REPOSITORY } from './domain/repositories/business.repository';
import { CreateBusinessUseCase } from './application/use-cases/create-business.use-case';
import { GetBusinessUseCase } from './application/use-cases/get-business.use-case';
import { UpdateBusinessUseCase } from './application/use-cases/update-business.use-case';
import { BusinessController } from './infrastructure/controllers/business.controller';
import { BusinessMongoRepository } from './infrastructure/repositories/business.mongo.repository';
import { BusinessModel, BusinessSchema } from './infrastructure/schemas/business.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BusinessModel.name, schema: BusinessSchema }]),
    forwardRef(() => UsersModule),
  ],
  controllers: [BusinessController],
  providers: [
    CreateBusinessUseCase,
    GetBusinessUseCase,
    UpdateBusinessUseCase,
    { provide: BUSINESS_REPOSITORY, useClass: BusinessMongoRepository },
  ],
  exports: [BUSINESS_REPOSITORY, GetBusinessUseCase],
})
export class BusinessModule {}
