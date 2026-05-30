import { Table } from '../entities/table.entity';

export abstract class TableRepository {
  abstract create(table: Table): Promise<Table>;
  abstract findById(id: string): Promise<Table | null>;
  abstract findByBusinessAndSlug(businessId: string, slug: string): Promise<Table | null>;
  abstract findByBusiness(businessId: string): Promise<Table[]>;
  abstract update(table: Table): Promise<Table>;
  abstract delete(id: string): Promise<void>;
  abstract existsByBusinessAndSlug(businessId: string, slug: string): Promise<boolean>;
}

export const TABLE_REPOSITORY = Symbol('TABLE_REPOSITORY');
