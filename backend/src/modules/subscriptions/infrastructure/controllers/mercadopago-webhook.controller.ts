import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@shared/decorators';
import { MercadoPagoWebhookUseCase } from '../../application/use-cases/mercadopago-webhook.use-case';

@Public()
@Controller('webhooks/mercadopago')
export class MercadoPagoWebhookController {
  constructor(private readonly webhook: MercadoPagoWebhookUseCase) {}

  @Post()
  async handle(@Body() body: { type?: string; data?: { id?: string | number } }) {
    await this.webhook.handleNotification(body);
    return { received: true };
  }
}
