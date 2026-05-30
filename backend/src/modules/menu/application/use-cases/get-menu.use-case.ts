import { Inject, Injectable } from '@nestjs/common';
import {
  MENU_CATEGORY_REPOSITORY,
  MENU_ITEM_REPOSITORY,
  MenuCategoryRepository,
  MenuItemRepository,
} from '../../domain/repositories/menu.repository';
import {
  MenuCategoryWithItemsView,
  presentCategory,
  presentItem,
} from '../presenters/menu.presenter';

@Injectable()
export class GetMenuUseCase {
  constructor(
    @Inject(MENU_CATEGORY_REPOSITORY) private readonly categories: MenuCategoryRepository,
    @Inject(MENU_ITEM_REPOSITORY) private readonly items: MenuItemRepository,
  ) {}

  /** Menú público agrupado por categoría. Solo categorías/productos activos. */
  async publicMenu(businessId: string): Promise<MenuCategoryWithItemsView[]> {
    const [categories, items] = await Promise.all([
      this.categories.findByBusiness(businessId),
      this.items.findByBusiness(businessId),
    ]);

    return categories
      .filter((c) => c.active)
      .map((category) => ({
        ...presentCategory(category),
        items: items.filter((i) => i.categoryId === category.id && i.available).map(presentItem),
      }));
  }
}
