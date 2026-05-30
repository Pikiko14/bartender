import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TableSessionStatus } from '@shared/enums/table-session-status.enum';
import { TableSession } from '../../domain/entities/table-session.entity';
import {
  TABLE_SESSION_REPOSITORY,
  TableSessionRepository,
} from '../../domain/repositories/table-session.repository';
import { presentTableSession } from '../presenters/table-session.presenter';

@Injectable()
export class OpenTableSessionUseCase {
  constructor(
    @Inject(TABLE_SESSION_REPOSITORY) private readonly sessions: TableSessionRepository,
  ) {}

  async execute(businessId: string, tableId: string) {
    const existing = await this.sessions.findOpenByTable(businessId, tableId);
    if (existing) return presentTableSession(existing);

    const created = await this.sessions.create(
      new TableSession({
        id: uuid(),
        businessId,
        tableId,
        status: TableSessionStatus.OPEN,
        openedAt: new Date(),
        closedAt: null,
      }),
    );
    return presentTableSession(created);
  }

  async getOpen(businessId: string, tableId: string) {
    const session = await this.sessions.findOpenByTable(businessId, tableId);
    return session ? presentTableSession(session) : null;
  }

  async getById(id: string) {
    const session = await this.sessions.findById(id);
    return session ? presentTableSession(session) : null;
  }
}
