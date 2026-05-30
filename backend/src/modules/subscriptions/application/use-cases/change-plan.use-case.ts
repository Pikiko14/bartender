import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { EntityNotFoundException } from '@core/domain/exceptions';
import { SubscriptionStatus } from '@modules/business/domain/entities/business.entity';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import {
  BillingCycle,
  Subscription,
  SubscriptionRecordStatus,
} from '../../domain/entities/subscription.entity';
import {
  PLAN_REPOSITORY,
  PlanRepository,
  SUBSCRIPTION_REPOSITORY,
  SubscriptionRepository,
} from '../../domain/repositories/subscription.repository';
import { IsEnum, IsString } from 'class-validator';

export class ChangePlanDto {
  @IsString()
  planSlug!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}

@Injectable()
export class ChangePlanUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptions: SubscriptionRepository,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
  ) {}

  async execute(businessId: string, ownerId: string, dto: ChangePlanDto) {
    const business = await this.businesses.findById(businessId);
    if (!business || business.ownerId !== ownerId) {
      throw new EntityNotFoundException('Negocio', businessId);
    }

    const plan = await this.plans.findBySlug(dto.planSlug);
    if (!plan) throw new EntityNotFoundException('Plan', dto.planSlug);

    const periodEnd = this.calcPeriodEnd(dto.billingCycle, plan.trialDays);
    let sub = await this.subscriptions.findByBusiness(businessId);

    if (!sub) {
      sub = await this.subscriptions.create(
        new Subscription({
          id: uuid(),
          businessId,
          planId: plan.id,
          status:
            plan.trialDays > 0
              ? SubscriptionRecordStatus.TRIALING
              : SubscriptionRecordStatus.ACTIVE,
          billingCycle: dto.billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        }),
      );
    } else {
      sub.changePlan(plan.id, periodEnd);
      sub = await this.subscriptions.update(sub);
    }

    business.setSubscription(SubscriptionStatus.ACTIVE);
    await this.businesses.update(business);

    return { subscription: sub.toPrimitives(), plan: plan.toPrimitives() };
  }

  /** Activa un plan tras confirmar el pago (webhook Mercado Pago). Sin periodo de prueba. */
  async activatePaidPlan(businessId: string, dto: ChangePlanDto) {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);

    const plan = await this.plans.findBySlug(dto.planSlug);
    if (!plan) throw new EntityNotFoundException('Plan', dto.planSlug);

    const periodEnd = this.calcPeriodEnd(dto.billingCycle, 0);
    let sub = await this.subscriptions.findByBusiness(businessId);

    if (!sub) {
      sub = await this.subscriptions.create(
        new Subscription({
          id: uuid(),
          businessId,
          planId: plan.id,
          status: SubscriptionRecordStatus.ACTIVE,
          billingCycle: dto.billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        }),
      );
    } else {
      sub.changePlan(plan.id, periodEnd);
      sub = await this.subscriptions.update(sub);
    }

    business.setSubscription(SubscriptionStatus.ACTIVE);
    await this.businesses.update(business);

    return { subscription: sub.toPrimitives(), plan: plan.toPrimitives() };
  }

  /** Asigna plan Basic con periodo de prueba al registrar un negocio nuevo. */
  async assignTrial(businessId: string): Promise<void> {
    const basic = await this.plans.findBySlug('basic');
    if (!basic) return;

    const existing = await this.subscriptions.findByBusiness(businessId);
    if (existing) return;

    const end = new Date();
    end.setDate(end.getDate() + (basic.trialDays || 14));

    await this.subscriptions.create(
      new Subscription({
        id: uuid(),
        businessId,
        planId: basic.id,
        status: SubscriptionRecordStatus.TRIALING,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: new Date(),
        currentPeriodEnd: end,
        canceledAt: null,
      }),
    );
  }

  private calcPeriodEnd(cycle: BillingCycle, trialDays: number): Date {
    const end = new Date();
    if (trialDays > 0) {
      end.setDate(end.getDate() + trialDays);
      return end;
    }
    if (cycle === BillingCycle.YEARLY) {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
