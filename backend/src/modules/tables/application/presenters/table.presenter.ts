import { Table } from '../../domain/entities/table.entity';

export interface TableView {
  id: string;
  businessId: string;
  number: number;
  name: string;
  slug: string;
  qrUrl: string;
  active: boolean;
}

export function presentTable(table: Table): TableView {
  const p = table.toPrimitives();
  return {
    id: p.id,
    businessId: p.businessId,
    number: p.number,
    name: p.name,
    slug: p.slug,
    qrUrl: p.qrUrl,
    active: p.active,
  };
}
