import { Customer } from '../../domain/entities/customer.entity';

export interface CustomerView {
  id: string;
  businessId: string;
  name: string;
  document: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export function presentCustomer(customer: Customer): CustomerView {
  const p = customer.toPrimitives();
  return {
    id: p.id,
    businessId: p.businessId,
    name: p.name,
    document: p.document,
    phone: p.phone ?? null,
    email: p.email ?? null,
    notes: p.notes ?? null,
  };
}
