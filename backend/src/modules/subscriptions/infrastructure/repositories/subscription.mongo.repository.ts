import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan } from '../../domain/entities/plan.entity';
import { Subscription } from '../../domain/entities/subscription.entity';
import {
  PlanRepository,
  SubscriptionRepository,
} from '../../domain/repositories/subscription.repository';
import { PlanMapper, SubscriptionMapper } from '../mappers/subscription.mapper';
import {
  PlanDocument,
  PlanModel,
  SubscriptionDocument,
  SubscriptionModel,
} from '../schemas/subscription.schema';

@Injectable()
export class PlanMongoRepository extends PlanRepository {
  constructor(@InjectModel(PlanModel.name) private readonly model: Model<PlanDocument>) {
    super();
  }

  async findAll(activeOnly = true): Promise<Plan[]> {
    const filter = activeOnly ? { active: true } : {};
    const docs = await this.model.find(filter).sort({ order: 1 }).exec();
    return docs.map(PlanMapper.toDomain);
  }

  async findById(id: string): Promise<Plan | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? PlanMapper.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    const doc = await this.model.findOne({ slug }).exec();
    return doc ? PlanMapper.toDomain(doc) : null;
  }

  async upsert(plan: Plan): Promise<Plan> {
    const updated = await this.model
      .findOneAndUpdate({ slug: plan.slug }, PlanMapper.toPersistence(plan), {
        upsert: true,
        new: true,
      })
      .exec();
    return PlanMapper.toDomain(updated as PlanDocument);
  }
}

@Injectable()
export class SubscriptionMongoRepository extends SubscriptionRepository {
  constructor(
    @InjectModel(SubscriptionModel.name) private readonly model: Model<SubscriptionDocument>,
  ) {
    super();
  }

  async create(subscription: Subscription): Promise<Subscription> {
    const created = await this.model.create(SubscriptionMapper.toPersistence(subscription));
    return SubscriptionMapper.toDomain(created);
  }

  async findByBusiness(businessId: string): Promise<Subscription | null> {
    const doc = await this.model.findOne({ businessId }).exec();
    return doc ? SubscriptionMapper.toDomain(doc) : null;
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const updated = await this.model
      .findOneAndUpdate(
        { businessId: subscription.businessId },
        SubscriptionMapper.toPersistence(subscription),
        { new: true },
      )
      .exec();
    return SubscriptionMapper.toDomain(updated as SubscriptionDocument);
  }
}
