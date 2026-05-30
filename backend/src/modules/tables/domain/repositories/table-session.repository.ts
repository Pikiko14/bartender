import { TableSession } from '../entities/table-session.entity';

export abstract class TableSessionRepository {
  abstract create(session: TableSession): Promise<TableSession>;
  abstract findById(id: string): Promise<TableSession | null>;
  abstract findOpenByTable(businessId: string, tableId: string): Promise<TableSession | null>;
  abstract findOpenByBusiness(businessId: string): Promise<TableSession[]>;
  abstract update(session: TableSession): Promise<TableSession>;
}

export const TABLE_SESSION_REPOSITORY = Symbol('TABLE_SESSION_REPOSITORY');
