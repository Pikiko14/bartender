import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrentUser, Public, RequirePermissions, Roles } from '@shared/decorators';
import { Permission, Role } from '@shared/enums';
import { PLAN_FEATURE_LABELS, PlanFeature } from '@shared/enums/plan-feature.enum';
import { ChangePlanDto, ChangePlanUseCase } from '../../application/use-cases/change-plan.use-case';
import {
  GetBusinessSubscriptionUseCase,
  ListPlansUseCase,
} from '../../application/use-cases/subscription.use-cases';

function presentPlan(plan: ReturnType<typeof Object>) {
  const p = plan as {
    id: string;
    slug: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    features: PlanFeature[];
    limits: Record<string, number | null>;
    trialDays: number;
    highlighted: boolean;
  };
  return {
    ...p,
    featureLabels: p.features.map((f) => ({
      key: f,
      label: PLAN_FEATURE_LABELS[f] ?? f,
    })),
  };
}

@Public()
@Controller('public/plans')
export class PublicPlansController {
  constructor(private readonly listPlans: ListPlansUseCase) {}

  @Get()
  async list() {
    const plans = await this.listPlans.execute(true);
    return plans.map((p) => presentPlan(p.toPrimitives()));
  }
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly getSubscription: GetBusinessSubscriptionUseCase,
    private readonly changePlan: ChangePlanUseCase,
  ) {}

  @Get('current')
  @RequirePermissions(Permission.BUSINESS_VIEW)
  async current(@CurrentUser('businessId') businessId: string) {
    const data = await this.getSubscription.execute(businessId);
    return {
      subscription: data.subscription,
      plan: presentPlan(data.plan),
    };
  }

  @Post('change-plan')
  @Roles(Role.OWNER)
  @RequirePermissions(Permission.BUSINESS_MANAGE)
  async upgrade(
    @CurrentUser('userId') ownerId: string,
    @CurrentUser('businessId') businessId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const result = await this.changePlan.execute(businessId, ownerId, dto);
    return {
      subscription: result.subscription,
      plan: presentPlan(result.plan),
    };
  }
}

@Controller('plans')
export class PlansAdminController {
  constructor(private readonly listPlans: ListPlansUseCase) {}

  @Get()
  @Roles(Role.OWNER)
  async list() {
    const plans = await this.listPlans.execute(false);
    return plans.map((p) => presentPlan(p.toPrimitives()));
  }
}
