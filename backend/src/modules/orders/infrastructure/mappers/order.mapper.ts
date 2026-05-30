import { Types } from 'mongoose';
import { Order } from '../../domain/entities/order.entity';
import { OrderItem } from '../../domain/value-objects/order-item.vo';
import { OrderDocument } from '../schemas/order.schema';

export class OrderMapper {
  static toDomain(doc: OrderDocument): Order {
    return new Order({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      tableId: doc.tableId.toString(),
      sessionId: doc.sessionId,
      status: doc.status,
      notes: doc.notes,
      items: doc.items.map(
        (i) =>
          new OrderItem({
            menuItemId: i.menuItemId.toString(),
            name: i.name,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            preparationArea: i.preparationArea,
            notes: i.notes,
          }),
      ),
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    });
  }

  static toPersistence(order: Order): Record<string, unknown> {
    return {
      businessId: new Types.ObjectId(order.businessId),
      tableId: new Types.ObjectId(order.tableId),
      sessionId: order.sessionId,
      items: order.items.map((i) => ({
        menuItemId: new Types.ObjectId(i.menuItemId),
        name: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        preparationArea: i.preparationArea,
        notes: i.notes,
      })),
      total: order.total,
      areas: order.areas,
      status: order.status,
      notes: order.notes,
    };
  }
}
