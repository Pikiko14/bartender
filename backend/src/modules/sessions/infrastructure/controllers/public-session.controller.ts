import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString } from 'class-validator';
import { Public } from '@shared/decorators';
import { GuestSessionService } from '../../application/guest-session.service';
import { ScanQrUseCase } from '../../application/use-cases/scan-qr.use-case';

class ScanDto {
  @IsString()
  businessSlug!: string;

  @IsString()
  tableSlug!: string;
}

@Public()
@Controller('public/sessions')
export class PublicSessionController {
  constructor(
    private readonly scanQr: ScanQrUseCase,
    private readonly sessions: GuestSessionService,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('scan')
  scan(@Body() dto: ScanDto) {
    return this.scanQr.execute(dto.businessSlug, dto.tableSlug);
  }

  @Get(':sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.sessions.get(sessionId);
  }
}
