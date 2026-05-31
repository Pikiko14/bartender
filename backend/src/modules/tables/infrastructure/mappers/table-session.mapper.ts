import { Types } from 'mongoose';
import { TableSession } from '../../domain/entities/table-session.entity';
import { TableSessionDocument } from '../schemas/table-session.schema';

export class TableSessionMapper {
  static toDomain(doc: TableSessionDocument): TableSession {
    return new TableSession({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      tableId: doc.tableId.toString(),
      status: doc.status,
      openedAt: doc.openedAt,
      closedAt: doc.closedAt,
      customerId: doc.customerId?.toString() ?? null,
    });
  }

  static toPersistence(session: TableSession): Record<string, unknown> {
    const p = session.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      tableId: new Types.ObjectId(p.tableId),
      status: p.status,
      openedAt: p.openedAt,
      closedAt: p.closedAt ?? null,
      customerId: p.customerId ? new Types.ObjectId(p.customerId) : null,
    };
  }
}
