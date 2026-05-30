import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import {
  PLAN_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
} from './domain/repositories/subscription.repository';
import { ChangePlanUseCase } from './application/use-cases/change-plan.use-case';
import {
  GetBusinessSubscriptionUseCase,
  ListPlansUseCase,
  PlanFeaturesService,
} from './application/use-cases/subscription.use-cases';
import {
  PlansAdminController,
  PublicPlansController,
  SubscriptionsController,
} from './infrastructure/controllers/subscriptions.controller';
import {
  PlanMongoRepository,
  SubscriptionMongoRepository,
} from './infrastructure/repositories/subscription.mongo.repository';
import {
  PlanModel,
  PlanSchema,
  SubscriptionModel,
  SubscriptionSchema,
} from './infrastructure/schemas/subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanModel.name, schema: PlanSchema },
      { name: SubscriptionModel.name, schema: SubscriptionSchema },
    ]),
    BusinessModule,
  ],
  controllers: [PublicPlansController, SubscriptionsController, PlansAdminController],
  providers: [
    ListPlansUseCase,
    GetBusinessSubscriptionUseCase,
    ChangePlanUseCase,
    PlanFeaturesService,
    { provide: PLAN_REPOSITORY, useClass: PlanMongoRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionMongoRepository },
  ],
  exports: [PlanFeaturesService, ChangePlanUseCase, PLAN_REPOSITORY, SUBSCRIPTION_REPOSITORY],
})
export class SubscriptionsModule {}
