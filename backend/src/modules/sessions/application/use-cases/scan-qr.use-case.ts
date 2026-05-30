import { Injectable } from '@nestjs/common';
import { BusinessRuleViolationException } from '@core/domain/exceptions';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import {
  presentBusiness,
  BusinessView,
} from '@modules/business/application/presenters/business.presenter';
import { ManageTablesUseCase } from '@modules/tables/application/use-cases/manage-tables.use-case';
import { presentTable, TableView } from '@modules/tables/application/presenters/table.presenter';
import { GuestSession, GuestSessionService } from '../guest-session.service';

export interface ScanResult {
  session: GuestSession;
  business: BusinessView;
  table: TableView;
}

/**
 * Resuelve el escaneo de un QR: identifica negocio + mesa y abre una sesión
 * guest temporal. No requiere autenticación.
 */
@Injectable()
export class ScanQrUseCase {
  constructor(
    private readonly getBusiness: GetBusinessUseCase,
    private readonly manageTables: ManageTablesUseCase,
    private readonly sessions: GuestSessionService,
  ) {}

  async execute(businessSlug: string, tableSlug: string): Promise<ScanResult> {
    const business = await this.getBusiness.bySlug(businessSlug);
    if (!business.isOperational()) {
      throw new BusinessRuleViolationException('El negocio no está disponible en este momento.');
    }
    const table = await this.manageTables.findPublic(business.id, tableSlug);
    const session = await this.sessions.create(business.id, table.id);

    return {
      session,
      business: presentBusiness(business),
      table: presentTable(table),
    };
  }
}
