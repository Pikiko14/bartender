import { Customer } from '../entities/customer.entity';

export abstract class CustomerRepository {
  abstract create(customer: Customer): Promise<Customer>;
  abstract findById(id: string): Promise<Customer | null>;
  abstract findByDocument(businessId: string, document: string): Promise<Customer | null>;
  abstract findByBusiness(businessId: string, search?: string, limit?: number): Promise<Customer[]>;
  abstract update(customer: Customer): Promise<Customer>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
