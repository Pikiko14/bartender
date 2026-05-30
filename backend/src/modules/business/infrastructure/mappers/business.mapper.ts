import { Types } from 'mongoose';
import { Business } from '../../domain/entities/business.entity';
import { BusinessDocument } from '../schemas/business.schema';

export class BusinessMapper {
  static toDomain(doc: BusinessDocument): Business {
    return new Business({
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      logo: doc.logo,
      cover: doc.cover,
      description: doc.description,
      ownerId: doc.ownerId.toString(),
      active: doc.active,
      subscriptionStatus: doc.subscriptionStatus,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    });
  }

  static toPersistence(business: Business): Record<string, unknown> {
    const p = business.toPrimitives();
    return {
      name: p.name,
      slug: p.slug,
      logo: p.logo,
      cover: p.cover,
      description: p.description,
      ownerId: new Types.ObjectId(p.ownerId),
      active: p.active,
      subscriptionStatus: p.subscriptionStatus,
    };
  }
}
