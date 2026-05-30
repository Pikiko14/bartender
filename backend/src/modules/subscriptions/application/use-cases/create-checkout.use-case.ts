import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityNotFoundException } from '@core/domain/exceptions';
import { BusinessRuleViolationException } from '@core/domain/exceptions';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '@modules/business/domain/repositories/business.repository';
import { BillingCycle } from '../../domain/entities/subscription.entity';
import { PLAN_REPOSITORY, PlanRepository } from '../../domain/repositories/subscription.repository';
import { MercadoPagoService } from '../../infrastructure/services/mercadopago.service';
import { IsEnum, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  planSlug!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}

export function buildCheckoutExternalReference(
  businessId: string,
  planSlug: string,
  billingCycle: BillingCycle,
): string {
  return `${businessId}:${planSlug}:${billingCycle}`;
}

export function parseCheckoutExternalReference(ref: string): {
  businessId: string;
  planSlug: string;
  billingCycle: BillingCycle;
} | null {
  const parts = ref.split(':');
  if (parts.length !== 3) return null;
  const [businessId, planSlug, billingCycle] = parts;
  if (!businessId || !planSlug) return null;
  if (billingCycle !== BillingCycle.MONTHLY && billingCycle !== BillingCycle.YEARLY) return null;
  return { businessId, planSlug, billingCycle: billingCycle as BillingCycle };
}

@Injectable()
export class CreateCheckoutUseCase {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    private readonly mercadoPago: MercadoPagoService,
    private readonly config: ConfigService,
  ) {}

  async execute(businessId: string, ownerId: string, dto: CreateCheckoutDto, ownerEmail?: string) {
    const business = await this.businesses.findById(businessId);
    if (!business || business.ownerId !== ownerId) {
      throw new EntityNotFoundException('Negocio', businessId);
    }

    const plan = await this.plans.findBySlug(dto.planSlug);
    if (!plan) throw new EntityNotFoundException('Plan', dto.planSlug);

    const planData = plan.toPrimitives();
    const amount =
      dto.billingCycle === BillingCycle.YEARLY ? planData.priceYearly : planData.priceMonthly;

    if (amount <= 0) {
      throw new BusinessRuleViolationException('Este plan no requiere pago.');
    }

    const publicAppUrl = this.config.get<string>('mercadoPago.publicAppUrl') ?? 'http://localhost:5173';
    const apiPrefix = this.config.get<string>('app.apiPrefix') ?? 'api';
    const webhookBase = this.config.get<string>('mercadoPago.webhookBaseUrl') ?? 'http://localhost:3000';
    const plansPath = `${publicAppUrl}/app/plans`;

    const cycleLabel = dto.billingCycle === BillingCycle.YEARLY ? 'anual' : 'mensual';
    const externalReference = buildCheckoutExternalReference(
      businessId,
      dto.planSlug,
      dto.billingCycle,
    );

    const preference = await this.mercadoPago.createPreference({
      items: [
        {
          title: `Bartender · Plan ${planData.name} (${cycleLabel})`,
          quantity: 1,
          unitPrice: amount,
          currencyId: 'COP',
        },
      ],
      externalReference,
      payerEmail: ownerEmail,
      backUrls: {
        success: `${plansPath}?payment=success`,
        failure: `${plansPath}?payment=failure`,
        pending: `${plansPath}?payment=pending`,
      },
      notificationUrl: `${webhookBase}/${apiPrefix}/webhooks/mercadopago`,
    });

    return {
      preferenceId: preference.id,
      checkoutUrl: preference.checkoutUrl,
    };
  }
}
