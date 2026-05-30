import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import { TABLE_REPOSITORY } from './domain/repositories/table.repository';
import { CreateTableUseCase } from './application/use-cases/create-table.use-case';
import { ManageTablesUseCase } from './application/use-cases/manage-tables.use-case';
import { TablesController } from './infrastructure/controllers/tables.controller';
import { TableMongoRepository } from './infrastructure/repositories/table.mongo.repository';
import { TableModel, TableSchema } from './infrastructure/schemas/table.schema';
import { QrService } from './infrastructure/services/qr.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TableModel.name, schema: TableSchema }]),
    BusinessModule,
  ],
  controllers: [TablesController],
  providers: [
    CreateTableUseCase,
    ManageTablesUseCase,
    QrService,
    { provide: TABLE_REPOSITORY, useClass: TableMongoRepository },
  ],
  exports: [ManageTablesUseCase, TABLE_REPOSITORY],
})
export class TablesModule {}
