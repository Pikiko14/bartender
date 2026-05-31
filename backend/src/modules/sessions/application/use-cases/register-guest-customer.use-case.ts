import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
} from '@core/domain/exceptions';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '@modules/customers/domain/repositories/customer.repository';
import { Customer } from '@modules/customers/domain/entities/customer.entity';
import { presentCustomer, CustomerView } from '@modules/customers/application/presenters/customer.presenter';
import {
  TABLE_SESSION_REPOSITORY,
  TableSessionRepository,
} from '@modules/tables/domain/repositories/table-session.repository';
import { presentTableSession, TableSessionView } from '@modules/tables/application/presenters/table-session.presenter';
import { GuestSessionService } from '../guest-session.service';
import { RegisterGuestCustomerDto } from '../dto/register-guest-customer.dto';

export interface RegisterGuestCustomerResult {
  customer: CustomerView;
  tableSession: TableSessionView;
}

@Injectable()
export class RegisterGuestCustomerUseCase {
  constructor(
    private readonly sessions: GuestSessionService,
    @Inject(TABLE_SESSION_REPOSITORY) private readonly tableSessions: TableSessionRepository,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
  ) {}

  async execute(dto: RegisterGuestCustomerDto): Promise<RegisterGuestCustomerResult> {
    const session = await this.sessions.get(dto.sessionId);
    const tableSession = await this.tableSessions.findById(session.tableSessionId);
    if (!tableSession) {
      throw new EntityNotFoundException('Sesión de mesa', session.tableSessionId);
    }
    if (!tableSession.isOpen()) {
      throw new BusinessRuleViolationException(
        'La mesa está cerrada. Escanea el QR de nuevo para abrir una nueva cuenta.',
      );
    }

    const document = dto.document.trim();
    const name = dto.name.trim();

    let customer = await this.customers.findByDocument(session.businessId, document);
    if (customer) {
      if (customer.name !== name) {
        customer.updateProfile({ name });
        customer = await this.customers.update(customer);
      }
    } else {
      customer = await this.customers.create(
        new Customer({
          id: uuid(),
          businessId: session.businessId,
          name,
          document,
          phone: null,
          email: null,
          notes: null,
        }),
      );
    }

    tableSession.assignCustomer(customer.id);
    await this.tableSessions.update(tableSession);

    return {
      customer: presentCustomer(customer),
      tableSession: presentTableSession(tableSession),
    };
  }
}
