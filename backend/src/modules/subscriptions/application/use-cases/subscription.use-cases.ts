import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { PlanFeature } from '@shared/enums/plan-feature.enum';
import { Plan } from '../../domain/entities/plan.entity';
import {
  PLAN_REPOSITORY,
  PlanRepository,
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../../domain/repositories/subscription.repository';
import { ChangePlanUseCase } from './change-plan.use-case';

@Injectable()
export class PlanFeaturesService {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
  ) {}

  async getPlanForBusiness(businessId: string): Promise<Plan | null> {
    const sub = await this.subscriptions.findByBusiness(businessId);
    if (!sub || !sub.isActive()) return null;
    return this.plans.findById(sub.planId);
  }

  async hasFeature(businessId: string, feature: PlanFeature): Promise<boolean> {
    const plan = await this.getPlanForBusiness(businessId);
    return plan?.hasFeature(feature) ?? false;
  }

  async assertFeature(businessId: string, feature: PlanFeature): Promise<void> {
    const ok = await this.hasFeature(businessId, feature);
    if (!ok) {
      throw new ForbiddenDomainException(
        `Tu plan actual no incluye el servicio "${feature}". Actualiza tu suscripción.`,
      );
    }
  }

  async getLimit(
    businessId: string,
    key: keyof Plan['limits'],
  ): Promise<number | null> {
    const plan = await this.getPlanForBusiness(businessId);
    return plan?.limits[key] ?? null;
  }
}

@Injectable()
export class ListPlansUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository) {}

  execute(publicOnly = true): Promise<Plan[]> {
    return this.plans.findAll(publicOnly);
  }
}

@Injectable()
export class GetBusinessSubscriptionUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    private readonly changePlan: ChangePlanUseCase,
  ) {}

  async execute(businessId: string) {
    let sub = await this.subscriptions.findByBusiness(businessId);
    if (!sub) {
      await this.changePlan.assignTrial(businessId);
      sub = await this.subscriptions.findByBusiness(businessId);
    }
    if (!sub) throw new EntityNotFoundException('Suscripción', businessId);
    const plan = await this.plans.findById(sub.planId);
    if (!plan) throw new EntityNotFoundException('Plan', sub.planId);
    return { subscription: sub.toPrimitives(), plan: plan.toPrimitives() };
  }
}
