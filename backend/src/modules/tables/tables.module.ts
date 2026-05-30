import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import { TABLE_REPOSITORY } from './domain/repositories/table.repository';
import { TABLE_SESSION_REPOSITORY } from './domain/repositories/table-session.repository';
import { CreateTableUseCase } from './application/use-cases/create-table.use-case';
import { ManageTablesUseCase } from './application/use-cases/manage-tables.use-case';
import { OpenTableSessionUseCase } from './application/use-cases/open-table-session.use-case';
import { TablesController } from './infrastructure/controllers/tables.controller';
import { TableMongoRepository } from './infrastructure/repositories/table.mongo.repository';
import { TableSessionMongoRepository } from './infrastructure/repositories/table-session.mongo.repository';
import { TableModel, TableSchema } from './infrastructure/schemas/table.schema';
import { TableSessionModel, TableSessionSchema } from './infrastructure/schemas/table-session.schema';
import { QrService } from './infrastructure/services/qr.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TableModel.name, schema: TableSchema },
      { name: TableSessionModel.name, schema: TableSessionSchema },
    ]),
    BusinessModule,
  ],
  controllers: [TablesController],
  providers: [
    CreateTableUseCase,
    ManageTablesUseCase,
    OpenTableSessionUseCase,
    QrService,
    { provide: TABLE_REPOSITORY, useClass: TableMongoRepository },
    { provide: TABLE_SESSION_REPOSITORY, useClass: TableSessionMongoRepository },
  ],
  exports: [
    ManageTablesUseCase,
    OpenTableSessionUseCase,
    TABLE_REPOSITORY,
    TABLE_SESSION_REPOSITORY,
  ],
})
export class TablesModule {}
