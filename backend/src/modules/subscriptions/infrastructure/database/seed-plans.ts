import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { AppModule } from '../../../../app.module';
import { PlanFeature } from '@shared/enums/plan-feature.enum';
import { Plan } from '../../domain/entities/plan.entity';
import { PLAN_REPOSITORY, PlanRepository } from '../../domain/repositories/subscription.repository';

const DEFAULT_PLANS: Omit<ReturnType<Plan['toPrimitives']>, 'id'>[] = [
  {
    slug: 'trial',
    name: 'Trial',
    description: 'Prueba gratuita de 14 días con funciones esenciales.',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 14,
    active: true,
    order: 0,
    highlighted: false,
    features: [
      PlanFeature.QR_TABLES,
      PlanFeature.REALTIME_ORDERS,
      PlanFeature.KITCHEN_DISPLAY,
      PlanFeature.BAR_DISPLAY,
      PlanFeature.MULTI_USER,
    ],
    limits: { maxTables: 5, maxUsers: 3, maxMenuItems: 30 },
  },
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Ideal para bares pequeños y gastrobares.',
    priceMonthly: 29,
    priceYearly: 290,
    trialDays: 0,
    active: true,
    order: 1,
    highlighted: false,
    features: [
      PlanFeature.QR_TABLES,
      PlanFeature.REALTIME_ORDERS,
      PlanFeature.KITCHEN_DISPLAY,
      PlanFeature.BAR_DISPLAY,
      PlanFeature.MULTI_USER,
      PlanFeature.MUSIC_SYSTEM,
    ],
    limits: { maxTables: 15, maxUsers: 8, maxMenuItems: 100 },
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Para locales con alto volumen y música social.',
    priceMonthly: 79,
    priceYearly: 790,
    trialDays: 0,
    active: true,
    order: 2,
    highlighted: true,
    features: [
      PlanFeature.QR_TABLES,
      PlanFeature.REALTIME_ORDERS,
      PlanFeature.KITCHEN_DISPLAY,
      PlanFeature.BAR_DISPLAY,
      PlanFeature.MUSIC_SYSTEM,
      PlanFeature.ANALYTICS,
      PlanFeature.MULTI_USER,
      PlanFeature.CUSTOM_BRANDING,
    ],
    limits: { maxTables: 50, maxUsers: 25, maxMenuItems: 500 },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Sin límites. Multi-sede, API y soporte prioritario.',
    priceMonthly: 199,
    priceYearly: 1990,
    trialDays: 0,
    active: true,
    order: 3,
    highlighted: false,
    features: Object.values(PlanFeature),
    limits: { maxTables: null, maxUsers: null, maxMenuItems: null },
  },
];

export async function seedPlans(app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>) {
  const logger = new Logger('SeedPlans');
  const plans = app.get<PlanRepository>(PLAN_REPOSITORY);

  for (const data of DEFAULT_PLANS) {
    await plans.upsert(new Plan({ id: uuid(), ...data }));
  }
  logger.log(`✅ ${DEFAULT_PLANS.length} planes insertados/actualizados.`);
}
