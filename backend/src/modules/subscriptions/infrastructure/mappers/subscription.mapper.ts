import { Plan } from '../../domain/entities/plan.entity';
import {
  BillingCycle,
  Subscription,
  SubscriptionRecordStatus,
} from '../../domain/entities/subscription.entity';
import { PlanDocument, SubscriptionDocument } from '../schemas/subscription.schema';

export class PlanMapper {
  static toDomain(doc: PlanDocument): Plan {
    return new Plan({
      id: doc._id.toString(),
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      priceMonthly: doc.priceMonthly,
      priceYearly: doc.priceYearly,
      features: doc.features ?? [],
      limits: {
        maxTables: doc.limits?.maxTables ?? null,
        maxUsers: doc.limits?.maxUsers ?? null,
        maxMenuItems: doc.limits?.maxMenuItems ?? null,
      },
      trialDays: doc.trialDays,
      active: doc.active,
      order: doc.order,
      highlighted: doc.highlighted,
    });
  }

  static toPersistence(plan: Plan): Record<string, unknown> {
    const p = plan.toPrimitives();
    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      features: p.features,
      limits: p.limits,
      trialDays: p.trialDays,
      active: p.active,
      order: p.order,
      highlighted: p.highlighted,
    };
  }
}

export class SubscriptionMapper {
  static toDomain(doc: SubscriptionDocument): Subscription {
    return new Subscription({
      id: doc._id.toString(),
      businessId: doc.businessId,
      planId: doc.planId,
      status: doc.status,
      billingCycle: doc.billingCycle,
      currentPeriodStart: doc.currentPeriodStart,
      currentPeriodEnd: doc.currentPeriodEnd,
      canceledAt: doc.canceledAt,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt,
    });
  }

  static toPersistence(sub: Subscription): Record<string, unknown> {
    const p = sub.toPrimitives();
    return {
      businessId: p.businessId,
      planId: p.planId,
      status: p.status,
      billingCycle: p.billingCycle,
      currentPeriodStart: p.currentPeriodStart,
      currentPeriodEnd: p.currentPeriodEnd,
      canceledAt: p.canceledAt,
    };
  }
}

export { BillingCycle, SubscriptionRecordStatus };
