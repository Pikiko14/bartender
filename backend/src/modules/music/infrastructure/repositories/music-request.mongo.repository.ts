import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EntityNotFoundException } from '@core/domain/exceptions';
import { MusicRequest, MusicRequestStatus } from '../../domain/entities/music-request.entity';
import { MusicRequestRepository } from '../../domain/repositories/music-request.repository';
import { MusicRequestMapper } from '../mappers/music-request.mapper';
import { MusicRequestDocument, MusicRequestModel } from '../schemas/music-request.schema';

function businessIdFilter(businessId: string): Record<string, unknown> {
  if (Types.ObjectId.isValid(businessId)) {
    const oid = new Types.ObjectId(businessId);
    return { $or: [{ businessId: oid }, { businessId }] };
  }
  return { businessId };
}

@Injectable()
export class MusicRequestMongoRepository extends MusicRequestRepository {
  constructor(
    @InjectModel(MusicRequestModel.name) private readonly model: Model<MusicRequestDocument>,
  ) {
    super();
  }

  async create(request: MusicRequest): Promise<MusicRequest> {
    const created = await this.model.create(MusicRequestMapper.toPersistence(request));
    return MusicRequestMapper.toDomain(created);
  }

  async findById(id: string): Promise<MusicRequest | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? MusicRequestMapper.toDomain(doc) : null;
  }

  async findByBusinessAndStatuses(
    businessId: string,
    statuses: MusicRequestStatus[],
  ): Promise<MusicRequest[]> {
    const docs = await this.model
      .find({ ...businessIdFilter(businessId), status: { $in: statuses } })
      .sort({ priority: -1, votes: -1, createdAt: 1 })
      .exec();
    return docs.map(MusicRequestMapper.toDomain);
  }

  async findNowPlaying(businessId: string): Promise<MusicRequest | null> {
    const doc = await this.model
      .findOne({ ...businessIdFilter(businessId), status: MusicRequestStatus.PLAYING })
      .sort({ playedAt: -1 })
      .exec();
    return doc ? MusicRequestMapper.toDomain(doc) : null;
  }

  async update(request: MusicRequest): Promise<MusicRequest> {
    const updated = await this.model
      .findByIdAndUpdate(request.id, MusicRequestMapper.toPersistence(request), {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!updated) {
      throw new EntityNotFoundException('Canción', request.id);
    }
    return MusicRequestMapper.toDomain(updated);
  }

  async countRecentBySession(
    businessId: string,
    requestedBy: string,
    since: Date,
  ): Promise<number> {
    return this.model
      .countDocuments({
        ...businessIdFilter(businessId),
        requestedBy,
        createdAt: { $gte: since },
      })
      .exec();
  }
}
