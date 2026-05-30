import { Inject, Injectable } from '@nestjs/common';
import {
  MENU_ITEM_REPOSITORY,
  MenuItemRepository,
} from '@modules/menu/domain/repositories/menu.repository';
import { OrderView } from '../presenters/order.presenter';

/** Rellena imágenes faltantes en pedidos antiguos consultando el menú actual. */
@Injectable()
export class OrderItemImageEnricher {
  constructor(@Inject(MENU_ITEM_REPOSITORY) private readonly menuItems: MenuItemRepository) {}

  async enrichMany(views: OrderView[]): Promise<OrderView[]> {
    if (!views.length) return views;

    const missingIds = new Set<string>();
    for (const view of views) {
      for (const item of view.items) {
        if (!item.image) missingIds.add(item.menuItemId);
      }
    }
    if (!missingIds.size) return views;

    const menuItems = await this.menuItems.findManyByIds([...missingIds]);
    const imageById = new Map(menuItems.map((m) => [m.id, m.toPrimitives().image]));

    return views.map((view) => ({
      ...view,
      items: view.items.map((item) => ({
        ...item,
        image: item.image ?? imageById.get(item.menuItemId) ?? null,
      })),
    }));
  }

  async enrichOne(view: OrderView): Promise<OrderView> {
    const [enriched] = await this.enrichMany([view]);
    return enriched;
  }
}
