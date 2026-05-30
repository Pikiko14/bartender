import { TableSessionStatus } from '@shared/enums/table-session-status.enum';
import { TableSession } from '../../domain/entities/table-session.entity';

export interface TableSessionView {
  id: string;
  businessId: string;
  tableId: string;
  status: TableSessionStatus;
  openedAt: Date;
  closedAt: Date | null;
}

export function presentTableSession(session: TableSession): TableSessionView {
  const p = session.toPrimitives();
  return {
    id: p.id,
    businessId: p.businessId,
    tableId: p.tableId,
    status: p.status,
    openedAt: p.openedAt,
    closedAt: p.closedAt ?? null,
  };
}
