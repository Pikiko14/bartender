import { Types } from 'mongoose';
import { Customer } from '../../domain/entities/customer.entity';
import { CustomerDocument } from '../schemas/customer.schema';

export class CustomerMapper {
  static toDomain(doc: CustomerDocument): Customer {
    return new Customer({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      name: doc.name,
      document: doc.document ?? '',
      phone: doc.phone,
      email: doc.email,
      notes: doc.notes,
    });
  }

  static toPersistence(customer: Customer): Record<string, unknown> {
    const p = customer.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      name: p.name,
      document: p.document,
      phone: p.phone ?? null,
      email: p.email ?? null,
      notes: p.notes ?? null,
    };
  }
}
