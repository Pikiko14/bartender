import { BusinessRuleViolationException } from '@core/domain/exceptions';
import { TableSessionStatus } from '@shared/enums/table-session-status.enum';

export interface TableSessionProps {
  id: string;
  businessId: string;
  tableId: string;
  status: TableSessionStatus;
  openedAt: Date;
  closedAt?: Date | null;
}

export class TableSession {
  constructor(private props: TableSessionProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get tableId(): string {
    return this.props.tableId;
  }
  get status(): TableSessionStatus {
    return this.props.status;
  }
  get openedAt(): Date {
    return this.props.openedAt;
  }
  get closedAt(): Date | null {
    return this.props.closedAt ?? null;
  }

  isOpen(): boolean {
    return this.props.status === TableSessionStatus.OPEN;
  }

  close(): void {
    if (!this.isOpen()) {
      throw new BusinessRuleViolationException('La mesa ya está cerrada.');
    }
    this.props.status = TableSessionStatus.CLOSED;
    this.props.closedAt = new Date();
  }

  toPrimitives(): TableSessionProps {
    return { ...this.props };
  }
}
