import { MenuCategory } from '../entities/menu-category.entity';
import { MenuItem } from '../entities/menu-item.entity';

export abstract class MenuCategoryRepository {
  abstract create(category: MenuCategory): Promise<MenuCategory>;
  abstract findById(id: string): Promise<MenuCategory | null>;
  abstract findByBusiness(businessId: string): Promise<MenuCategory[]>;
  abstract update(category: MenuCategory): Promise<MenuCategory>;
  abstract delete(id: string): Promise<void>;
}

export abstract class MenuItemRepository {
  abstract create(item: MenuItem): Promise<MenuItem>;
  abstract findById(id: string): Promise<MenuItem | null>;
  abstract findManyByIds(ids: string[]): Promise<MenuItem[]>;
  abstract findByBusiness(businessId: string): Promise<MenuItem[]>;
  abstract findByCategory(categoryId: string): Promise<MenuItem[]>;
  abstract update(item: MenuItem): Promise<MenuItem>;
  abstract delete(id: string): Promise<void>;
}

export const MENU_CATEGORY_REPOSITORY = Symbol('MENU_CATEGORY_REPOSITORY');
export const MENU_ITEM_REPOSITORY = Symbol('MENU_ITEM_REPOSITORY');
