import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import {
  PLAN_REPOSITORY,
  SUBSCRIPTION_REPOSITORY,
} from './domain/repositories/subscription.repository';
import { ChangePlanUseCase } from './application/use-cases/change-plan.use-case';
import { CreateCheckoutUseCase } from './application/use-cases/create-checkout.use-case';
import { MercadoPagoWebhookUseCase } from './application/use-cases/mercadopago-webhook.use-case';
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
import { MercadoPagoWebhookController } from './infrastructure/controllers/mercadopago-webhook.controller';
import { MercadoPagoService } from './infrastructure/services/mercadopago.service';
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
    forwardRef(() => BusinessModule),
  ],
  controllers: [
    PublicPlansController,
    SubscriptionsController,
    PlansAdminController,
    MercadoPagoWebhookController,
  ],
  providers: [
    ListPlansUseCase,
    GetBusinessSubscriptionUseCase,
    ChangePlanUseCase,
    CreateCheckoutUseCase,
    MercadoPagoWebhookUseCase,
    MercadoPagoService,
    PlanFeaturesService,
    { provide: PLAN_REPOSITORY, useClass: PlanMongoRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionMongoRepository },
  ],
  exports: [PlanFeaturesService, ChangePlanUseCase, PLAN_REPOSITORY, SUBSCRIPTION_REPOSITORY],
})
export class SubscriptionsModule {}
