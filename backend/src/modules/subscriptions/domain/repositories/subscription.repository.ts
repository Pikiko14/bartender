import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';

export abstract class PlanRepository {
  abstract findAll(activeOnly?: boolean): Promise<Plan[]>;
  abstract findById(id: string): Promise<Plan | null>;
  abstract findBySlug(slug: string): Promise<Plan | null>;
  abstract upsert(plan: Plan): Promise<Plan>;
}

export abstract class SubscriptionRepository {
  abstract create(subscription: Subscription): Promise<Subscription>;
  abstract findByBusiness(businessId: string): Promise<Subscription | null>;
  abstract update(subscription: Subscription): Promise<Subscription>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
