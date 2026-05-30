import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table } from '../../domain/entities/table.entity';
import { TableRepository } from '../../domain/repositories/table.repository';
import { TableMapper } from '../mappers/table.mapper';
import { TableDocument, TableModel } from '../schemas/table.schema';

@Injectable()
export class TableMongoRepository extends TableRepository {
  constructor(@InjectModel(TableModel.name) private readonly model: Model<TableDocument>) {
    super();
  }

  async create(table: Table): Promise<Table> {
    const created = await this.model.create(TableMapper.toPersistence(table));
    return TableMapper.toDomain(created);
  }

  async findById(id: string): Promise<Table | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? TableMapper.toDomain(doc) : null;
  }

  async findByBusinessAndSlug(businessId: string, slug: string): Promise<Table | null> {
    const doc = await this.model
      .findOne({ businessId: new Types.ObjectId(businessId), slug })
      .exec();
    return doc ? TableMapper.toDomain(doc) : null;
  }

  async findByBusiness(businessId: string): Promise<Table[]> {
    const docs = await this.model
      .find({ businessId: new Types.ObjectId(businessId) })
      .sort({ number: 1 })
      .exec();
    return docs.map(TableMapper.toDomain);
  }

  async update(table: Table): Promise<Table> {
    const updated = await this.model
      .findByIdAndUpdate(table.id, TableMapper.toPersistence(table), { new: true })
      .exec();
    return TableMapper.toDomain(updated as TableDocument);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  async existsByBusinessAndSlug(businessId: string, slug: string): Promise<boolean> {
    const count = await this.model
      .countDocuments({ businessId: new Types.ObjectId(businessId), slug })
      .exec();
    return count > 0;
  }
}
