import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business } from '../../domain/entities/business.entity';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { BusinessMapper } from '../mappers/business.mapper';
import { BusinessDocument, BusinessModel } from '../schemas/business.schema';

@Injectable()
export class BusinessMongoRepository extends BusinessRepository {
  constructor(@InjectModel(BusinessModel.name) private readonly model: Model<BusinessDocument>) {
    super();
  }

  async create(business: Business): Promise<Business> {
    const created = await this.model.create(BusinessMapper.toPersistence(business));
    return BusinessMapper.toDomain(created);
  }

  async findById(id: string): Promise<Business | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? BusinessMapper.toDomain(doc) : null;
  }

  async findByIdWithSpotifySecrets(id: string): Promise<Business | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findById(id)
      .select('+spotifyAccessToken +spotifyRefreshToken +spotifyTokenExpiresAt')
      .exec();
    return doc ? BusinessMapper.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Business | null> {
    const doc = await this.model.findOne({ slug }).exec();
    return doc ? BusinessMapper.toDomain(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Business[]> {
    const docs = await this.model
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(BusinessMapper.toDomain);
  }

  async update(business: Business): Promise<Business> {
    const updated = await this.model
      .findByIdAndUpdate(business.id, BusinessMapper.toPersistence(business), { new: true })
      .exec();
    return BusinessMapper.toDomain(updated as BusinessDocument);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.model.countDocuments({ slug }).exec();
    return count > 0;
  }
}
