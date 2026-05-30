import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order } from '../../domain/entities/order.entity';
import { OrderFilter, OrderRepository } from '../../domain/repositories/order.repository';
import { OrderMapper } from '../mappers/order.mapper';
import { OrderDocument, OrderModel } from '../schemas/order.schema';

@Injectable()
export class OrderMongoRepository extends OrderRepository {
  constructor(@InjectModel(OrderModel.name) private readonly model: Model<OrderDocument>) {
    super();
  }

  async create(order: Order): Promise<Order> {
    const created = await this.model.create(OrderMapper.toPersistence(order));
    return OrderMapper.toDomain(created);
  }

  async findById(id: string): Promise<Order | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? OrderMapper.toDomain(doc) : null;
  }

  async find(filter: OrderFilter): Promise<Order[]> {
    const query: FilterQuery<OrderDocument> = {
      businessId: new Types.ObjectId(filter.businessId),
    };
    if (filter.statuses?.length) query.status = { $in: filter.statuses };
    if (filter.area) query.areas = filter.area;
    if (filter.tableId) query.tableId = new Types.ObjectId(filter.tableId);
    if (filter.sessionId) query.sessionId = filter.sessionId;
    if (filter.from || filter.to) {
      query.createdAt = {};
      if (filter.from) (query.createdAt as Record<string, Date>).$gte = filter.from;
      if (filter.to) (query.createdAt as Record<string, Date>).$lte = filter.to;
    }

    const docs = await this.model.find(query).sort({ createdAt: 1 }).exec();
    return docs.map(OrderMapper.toDomain);
  }

  async update(order: Order): Promise<Order> {
    const updated = await this.model
      .findByIdAndUpdate(order.id, OrderMapper.toPersistence(order), { new: true })
      .exec();
    return OrderMapper.toDomain(updated as OrderDocument);
  }
}
