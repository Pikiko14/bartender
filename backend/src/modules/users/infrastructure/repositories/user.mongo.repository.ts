import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { buildPaginatedResult, PaginatedResult, PaginationParams } from '@core/domain/pagination';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserMapper } from '../mappers/user.mapper';
import { UserDocument, UserModel } from '../schemas/user.schema';

@Injectable()
export class UserMongoRepository extends UserRepository {
  constructor(@InjectModel(UserModel.name) private readonly model: Model<UserDocument>) {
    super();
  }

  async create(user: User): Promise<User> {
    const created = await this.model.create(UserMapper.toPersistence(user));
    return UserMapper.toDomain(created);
  }

  async findById(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase() }).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByBusiness(
    businessId: string,
    { page, limit }: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    const filter = { businessId: new Types.ObjectId(businessId) };
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return buildPaginatedResult(docs.map(UserMapper.toDomain), total, { page, limit });
  }

  async update(user: User): Promise<User> {
    const updated = await this.model
      .findByIdAndUpdate(user.id, UserMapper.toPersistence(user), { new: true })
      .exec();
    return UserMapper.toDomain(updated as UserDocument);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  async countByBusiness(businessId: string): Promise<number> {
    return this.model.countDocuments({ businessId: new Types.ObjectId(businessId) }).exec();
  }
}
