import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer } from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CustomerMapper } from '../mappers/customer.mapper';
import { CustomerDocument, CustomerModel } from '../schemas/customer.schema';

@Injectable()
export class CustomerMongoRepository extends CustomerRepository {
  constructor(@InjectModel(CustomerModel.name) private readonly model: Model<CustomerDocument>) {
    super();
  }

  async create(customer: Customer): Promise<Customer> {
    const created = await this.model.create(CustomerMapper.toPersistence(customer));
    return CustomerMapper.toDomain(created);
  }

  async findById(id: string): Promise<Customer | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? CustomerMapper.toDomain(doc) : null;
  }

  async findByDocument(businessId: string, document: string): Promise<Customer | null> {
    const doc = await this.model
      .findOne({
        businessId: new Types.ObjectId(businessId),
        document: document.trim(),
      })
      .exec();
    return doc ? CustomerMapper.toDomain(doc) : null;
  }

  async findByBusiness(businessId: string, search?: string, limit = 30): Promise<Customer[]> {
    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };
    if (search?.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { document: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }
    const docs = await this.model.find(query).sort({ name: 1 }).limit(limit).exec();
    return docs.map(CustomerMapper.toDomain);
  }

  async update(customer: Customer): Promise<Customer> {
    const updated = await this.model
      .findByIdAndUpdate(customer.id, CustomerMapper.toPersistence(customer), { new: true })
      .exec();
    return CustomerMapper.toDomain(updated as CustomerDocument);
  }
}
