import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '@shared/decorators';
import { GuestSessionService } from '../../application/guest-session.service';
import { RegisterGuestCustomerDto } from '../../application/dto/register-guest-customer.dto';
import { RegisterGuestCustomerUseCase } from '../../application/use-cases/register-guest-customer.use-case';
import { ScanQrUseCase } from '../../application/use-cases/scan-qr.use-case';

class ScanDto {
  @IsString()
  businessSlug!: string;

  @IsString()
  tableSlug!: string;

  @IsOptional()
  @IsString()
  resumeSessionId?: string;
}

@Public()
@Controller('public/sessions')
export class PublicSessionController {
  constructor(
    private readonly scanQr: ScanQrUseCase,
    private readonly sessions: GuestSessionService,
    private readonly registerCustomer: RegisterGuestCustomerUseCase,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('scan')
  scan(@Body() dto: ScanDto) {
    return this.scanQr.execute(dto.businessSlug, dto.tableSlug, dto.resumeSessionId);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register-customer')
  registerGuestCustomer(@Body() dto: RegisterGuestCustomerDto) {
    return this.registerCustomer.execute(dto);
  }

  @Get(':sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.sessions.get(sessionId);
  }
}
