import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ForbiddenDomainException } from '@core/domain/exceptions';
import { Customer } from '../../domain/entities/customer.entity';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
} from '../../domain/repositories/customer.repository';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { presentCustomer } from '../presenters/customer.presenter';

@Injectable()
export class ManageCustomersUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository) {}

  async list(businessId: string, search?: string) {
    const items = await this.customers.findByBusiness(businessId, search);
    return items.map(presentCustomer);
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    const created = await this.customers.create(
      new Customer({
        id: uuid(),
        businessId,
        name: dto.name.trim(),
        document: dto.document.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        notes: dto.notes?.trim() || null,
      }),
    );
    return presentCustomer(created);
  }

  async getById(businessId: string, customerId: string) {
    const customer = await this.customers.findById(customerId);
    if (!customer || customer.businessId !== businessId) {
      throw new ForbiddenDomainException('Cliente no encontrado.');
    }
    return presentCustomer(customer);
  }
}
