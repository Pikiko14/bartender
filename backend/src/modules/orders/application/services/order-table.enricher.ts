import { Inject, Injectable } from '@nestjs/common';
import {
  TABLE_REPOSITORY,
  TableRepository,
} from '@modules/tables/domain/repositories/table.repository';
import { attachTableInfo, OrderView } from '../presenters/order.presenter';

@Injectable()
export class OrderTableEnricher {
  constructor(@Inject(TABLE_REPOSITORY) private readonly tables: TableRepository) {}

  async enrichOne(view: OrderView): Promise<OrderView> {
    const table = await this.tables.findById(view.tableId);
    return attachTableInfo(view, table);
  }

  async enrichMany(views: OrderView[], businessId: string): Promise<OrderView[]> {
    if (!views.length) return views;
    const map = new Map(
      (await this.tables.findByBusiness(businessId)).map((t) => [t.id, t]),
    );
    return views.map((view) => attachTableInfo(view, map.get(view.tableId) ?? null));
  }
}
