import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BusinessRuleViolationException } from '@core/domain/exceptions';

export interface CheckoutPreferenceItem {
  title: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
}

export interface CreatePreferenceInput {
  items: CheckoutPreferenceItem[];
  externalReference: string;
  payerEmail?: string;
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  notificationUrl: string;
}

interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

interface PaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly base = 'https://api.mercadopago.com';

  constructor(private readonly config: ConfigService) {}

  private get accessToken(): string {
    const token = this.config.get<string>('mercadoPago.accessToken');
    if (!token) {
      throw new BusinessRuleViolationException(
        'Mercado Pago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN).',
      );
    }
    return token;
  }

  isSandbox(): boolean {
    return this.accessToken.startsWith('TEST-');
  }

  async createPreference(input: CreatePreferenceInput): Promise<{ id: string; checkoutUrl: string }> {
    try {
      const { data } = await axios.post<PreferenceResponse>(
        `${this.base}/checkout/preferences`,
        {
          items: input.items.map((item) => ({
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            currency_id: item.currencyId ?? 'COP',
          })),
          external_reference: input.externalReference,
          payer: input.payerEmail ? { email: input.payerEmail } : undefined,
          back_urls: input.backUrls,
          auto_return: 'approved',
          notification_url: input.notificationUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        },
      );

      const checkoutUrl =
        this.isSandbox() && data.sandbox_init_point ? data.sandbox_init_point : data.init_point;

      return { id: data.id, checkoutUrl };
    } catch (err) {
      this.logger.error('Error creando preferencia Mercado Pago', err);
      throw new BusinessRuleViolationException(
        'No se pudo iniciar el pago con Mercado Pago. Revisa la configuración e inténtalo de nuevo.',
      );
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const { data } = await axios.get<PaymentResponse>(`${this.base}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      timeout: 12000,
    });
    return data;
  }
}
