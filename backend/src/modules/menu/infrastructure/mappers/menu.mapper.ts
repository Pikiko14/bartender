import { Types } from 'mongoose';
import { MenuCategory } from '../../domain/entities/menu-category.entity';
import { MenuItem } from '../../domain/entities/menu-item.entity';
import { MenuCategoryDocument, MenuItemDocument } from '../schemas/menu.schema';

export class MenuCategoryMapper {
  static toDomain(doc: MenuCategoryDocument): MenuCategory {
    return new MenuCategory({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      name: doc.name,
      type: doc.type,
      order: doc.order,
      active: doc.active,
      image: doc.image,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
    });
  }

  static toPersistence(category: MenuCategory): Record<string, unknown> {
    const p = category.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      name: p.name,
      type: p.type,
      order: p.order,
      active: p.active,
      image: p.image,
    };
  }
}

export class MenuItemMapper {
  static toDomain(doc: MenuItemDocument): MenuItem {
    return new MenuItem({
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      categoryId: doc.categoryId.toString(),
      name: doc.name,
      description: doc.description,
      price: doc.price,
      image: doc.image,
      stock: doc.stock,
      available: doc.available,
      preparationArea: doc.preparationArea,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
    });
  }

  static toPersistence(item: MenuItem): Record<string, unknown> {
    const p = item.toPrimitives();
    return {
      businessId: new Types.ObjectId(p.businessId),
      categoryId: new Types.ObjectId(p.categoryId),
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      stock: p.stock,
      available: p.available,
      preparationArea: p.preparationArea,
    };
  }
}
