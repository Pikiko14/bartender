import { Inject, Injectable } from '@nestjs/common';
import { BusinessRuleViolationException, EntityNotFoundException } from '@core/domain/exceptions';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import {
  presentBusiness,
  BusinessView,
} from '@modules/business/application/presenters/business.presenter';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '@modules/customers/domain/repositories/customer.repository';
import { presentCustomer, CustomerView } from '@modules/customers/application/presenters/customer.presenter';
import { ManageTablesUseCase } from '@modules/tables/application/use-cases/manage-tables.use-case';
import { OpenTableSessionUseCase } from '@modules/tables/application/use-cases/open-table-session.use-case';
import { TableSessionView } from '@modules/tables/application/presenters/table-session.presenter';
import { presentTable, TableView } from '@modules/tables/application/presenters/table.presenter';
import { GuestSession, GuestSessionService } from '../guest-session.service';

export interface ScanResult {
  session: GuestSession;
  business: BusinessView;
  table: TableView;
  tableSession: TableSessionView;
  customer: CustomerView | null;
  requiresCustomerRegistration: boolean;
  resumed: boolean;
}

/**
 * Resuelve el escaneo de un QR: identifica negocio + mesa y abre o reutiliza
 * la sesión de mesa (cuenta) hasta el cierre con factura.
 */
@Injectable()
export class ScanQrUseCase {
  constructor(
    private readonly getBusiness: GetBusinessUseCase,
    private readonly manageTables: ManageTablesUseCase,
    private readonly openTableSession: OpenTableSessionUseCase,
    private readonly sessions: GuestSessionService,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
  ) {}

  async execute(
    businessSlug: string,
    tableSlug: string,
    resumeSessionId?: string,
  ): Promise<ScanResult> {
    const business = await this.getBusiness.bySlug(businessSlug);
    if (!business.isOperational()) {
      throw new BusinessRuleViolationException('El negocio no está disponible en este momento.');
    }
    const table = await this.manageTables.findPublic(business.id, tableSlug);

    if (resumeSessionId) {
      const resumed = await this.tryResume(business.id, table.id, resumeSessionId);
      if (resumed) {
        const customer = await this.loadCustomer(resumed.tableSession);
        return {
          ...resumed,
          business: presentBusiness(business),
          table: presentTable(table),
          customer,
          requiresCustomerRegistration: !customer && resumed.tableSession.status === 'open',
          resumed: true,
        };
      }
    }

    const tableSession = await this.openTableSession.execute(business.id, table.id);
    const session = await this.sessions.create(business.id, table.id, tableSession.id);
    const customer = await this.loadCustomer(tableSession);

    return {
      session,
      business: presentBusiness(business),
      table: presentTable(table),
      tableSession,
      customer,
      requiresCustomerRegistration: !customer && tableSession.status === 'open',
      resumed: false,
    };
  }

  private async loadCustomer(tableSession: TableSessionView): Promise<CustomerView | null> {
    if (!tableSession.customerId) return null;
    const customer = await this.customers.findById(tableSession.customerId);
    return customer ? presentCustomer(customer) : null;
  }

  private async tryResume(
    businessId: string,
    tableId: string,
    resumeSessionId: string,
  ): Promise<{ session: GuestSession; tableSession: TableSessionView } | null> {
    try {
      const guest = await this.sessions.get(resumeSessionId);
      if (guest.businessId !== businessId || guest.tableId !== tableId) return null;

      const tableSession = await this.openTableSession.getById(guest.tableSessionId);
      if (!tableSession || tableSession.status !== 'open') return null;

      const session = await this.sessions.touch(resumeSessionId);
      return { session, tableSession };
    } catch (e) {
      if (e instanceof EntityNotFoundException) return null;
      throw e;
    }
  }
}
