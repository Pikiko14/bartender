import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TableSessionStatus } from '@shared/enums/table-session-status.enum';
import { TableSession } from '../../domain/entities/table-session.entity';
import { TableSessionRepository } from '../../domain/repositories/table-session.repository';
import { TableSessionMapper } from '../mappers/table-session.mapper';
import { TableSessionDocument, TableSessionModel } from '../schemas/table-session.schema';

@Injectable()
export class TableSessionMongoRepository extends TableSessionRepository {
  constructor(
    @InjectModel(TableSessionModel.name) private readonly model: Model<TableSessionDocument>,
  ) {
    super();
  }

  async create(session: TableSession): Promise<TableSession> {
    const created = await this.model.create(TableSessionMapper.toPersistence(session));
    return TableSessionMapper.toDomain(created);
  }

  async findById(id: string): Promise<TableSession | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? TableSessionMapper.toDomain(doc) : null;
  }

  async findOpenByTable(businessId: string, tableId: string): Promise<TableSession | null> {
    const doc = await this.model
      .findOne({
        businessId: new Types.ObjectId(businessId),
        tableId: new Types.ObjectId(tableId),
        status: TableSessionStatus.OPEN,
      })
      .sort({ openedAt: -1 })
      .exec();
    return doc ? TableSessionMapper.toDomain(doc) : null;
  }

  async findOpenByBusiness(businessId: string): Promise<TableSession[]> {
    const docs = await this.model
      .find({
        businessId: new Types.ObjectId(businessId),
        status: TableSessionStatus.OPEN,
      })
      .sort({ openedAt: 1 })
      .exec();
    return docs.map(TableSessionMapper.toDomain);
  }

  async findClosedByBusiness(businessId: string, limit = 50): Promise<TableSession[]> {
    const docs = await this.model
      .find({
        businessId: new Types.ObjectId(businessId),
        status: TableSessionStatus.CLOSED,
      })
      .sort({ closedAt: -1 })
      .limit(limit)
      .exec();
    return docs.map(TableSessionMapper.toDomain);
  }

  async update(session: TableSession): Promise<TableSession> {
    const updated = await this.model
      .findByIdAndUpdate(session.id, TableSessionMapper.toPersistence(session), { new: true })
      .exec();
    return TableSessionMapper.toDomain(updated as TableSessionDocument);
  }
}
