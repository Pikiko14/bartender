import { Types } from 'mongoose';
import { Table } from '../../domain/entities/table.entity';
import { TableDocument } from '../schemas/table.schema';

export class TableMapper {
  static toDomain(doc: TableDocument): Table {
    return new Table({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      number: doc.number,
      name: doc.name,
      slug: doc.slug,
      qrUrl: doc.qrUrl,
      active: doc.active,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    });
  }

  static toPersistence(table: Table): Record<string, unknown> {
    const p = table.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      number: p.number,
      name: p.name,
      slug: p.slug,
      qrUrl: p.qrUrl,
      active: p.active,
    };
  }
}
