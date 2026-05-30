import { Module } from '@nestjs/common';
import { BusinessModule } from '@modules/business/business.module';
import { TablesModule } from '@modules/tables/tables.module';
import { GuestSessionService } from './application/guest-session.service';
import { ScanQrUseCase } from './application/use-cases/scan-qr.use-case';
import { PublicSessionController } from './infrastructure/controllers/public-session.controller';

@Module({
  imports: [BusinessModule, TablesModule],
  controllers: [PublicSessionController],
  providers: [GuestSessionService, ScanQrUseCase],
  exports: [GuestSessionService],
})
export class SessionsModule {}
