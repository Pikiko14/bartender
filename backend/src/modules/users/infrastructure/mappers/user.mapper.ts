import { Types } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import { UserDocument } from '../schemas/user.schema';

export class UserMapper {
  static toDomain(doc: UserDocument): User {
    return new User({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      businessId: doc.businessId ? doc.businessId.toString() : null,
      active: doc.active,
      extraPermissions: doc.extraPermissions ?? [],
      revokedPermissions: doc.revokedPermissions ?? [],
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt?: Date }).updatedAt,
    });
  }

  static toPersistence(user: User): Record<string, unknown> {
    const p = user.toPrimitives();
    return {
      name: p.name,
      email: p.email,
      passwordHash: p.passwordHash,
      role: p.role,
      businessId: p.businessId ? new Types.ObjectId(p.businessId) : null,
      active: p.active,
      extraPermissions: p.extraPermissions,
      revokedPermissions: p.revokedPermissions,
    };
  }
}
