import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../../../../app.module';
import { PlanFeature } from '@shared/enums/plan-feature.enum';
import { Plan } from '../../domain/entities/plan.entity';
import { PLAN_REPOSITORY, PlanRepository } from '../../domain/repositories/subscription.repository';

const ALL_FEATURES = [
  PlanFeature.QR_TABLES,
  PlanFeature.REALTIME_ORDERS,
  PlanFeature.KITCHEN_DISPLAY,
  PlanFeature.BAR_DISPLAY,
  PlanFeature.MULTI_USER,
  PlanFeature.MUSIC_YOUTUBE,
  PlanFeature.MUSIC_SPOTIFY,
  PlanFeature.ANALYTICS,
  PlanFeature.CUSTOM_BRANDING,
  PlanFeature.API_ACCESS,
  PlanFeature.PRIORITY_SUPPORT,
] as const;

const DEFAULT_PLANS: Omit<ReturnType<Plan['toPrimitives']>, 'id'>[] = [
  {
    slug: 'basic',
    name: 'Basic',
    description: 'Todas las funciones · máximo 5 usuarios.',
    priceMonthly: 40_000,
    priceYearly: 400_000,
    trialDays: 14,
    active: true,
    order: 0,
    highlighted: false,
    features: [...ALL_FEATURES],
    limits: { maxTables: 20, maxUsers: 5, maxMenuItems: 150 },
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Todas las funciones · usuarios ilimitados.',
    priceMonthly: 80_000,
    priceYearly: 800_000,
    trialDays: 0,
    active: true,
    order: 1,
    highlighted: true,
    features: [...ALL_FEATURES],
    limits: { maxTables: null, maxUsers: null, maxMenuItems: null },
  },
];

const ACTIVE_SLUGS = DEFAULT_PLANS.map((p) => p.slug);

export async function seedPlans(app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>) {
  const logger = new Logger('SeedPlans');
  const plans = app.get<PlanRepository>(PLAN_REPOSITORY);

  for (const data of DEFAULT_PLANS) {
    await plans.upsert(new Plan({ id: uuid(), ...data }));
  }

  await plans.deactivateExcept(ACTIVE_SLUGS);

  logger.log(`✅ ${DEFAULT_PLANS.length} planes insertados/actualizados (basic, pro).`);
}
