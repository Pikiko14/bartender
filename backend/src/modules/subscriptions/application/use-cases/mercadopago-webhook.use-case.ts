import { Injectable, Logger } from '@nestjs/common';
import { ChangePlanDto, ChangePlanUseCase } from './change-plan.use-case';
import { parseCheckoutExternalReference } from './create-checkout.use-case';
import { MercadoPagoService } from '../../infrastructure/services/mercadopago.service';

@Injectable()
export class MercadoPagoWebhookUseCase {
  private readonly logger = new Logger(MercadoPagoWebhookUseCase.name);

  constructor(
    private readonly mercadoPago: MercadoPagoService,
    private readonly changePlan: ChangePlanUseCase,
  ) {}

  async handleNotification(body: { type?: string; data?: { id?: string | number } }): Promise<void> {
    if (body.type !== 'payment' || body.data?.id == null) {
      return;
    }

    const paymentId = String(body.data.id);
    const payment = await this.mercadoPago.getPayment(paymentId);

    if (payment.status !== 'approved') {
      this.logger.log(`Pago ${paymentId} ignorado: ${payment.status} (${payment.status_detail})`);
      return;
    }

    const parsed = parseCheckoutExternalReference(payment.external_reference);
    if (!parsed) {
      this.logger.warn(`external_reference inválida en pago ${paymentId}: ${payment.external_reference}`);
      return;
    }

    const dto: ChangePlanDto = {
      planSlug: parsed.planSlug,
      billingCycle: parsed.billingCycle,
    };

    await this.changePlan.activatePaidPlan(parsed.businessId, dto);
    this.logger.log(
      `Plan ${parsed.planSlug} activado para negocio ${parsed.businessId} (pago ${paymentId})`,
    );
  }
}
