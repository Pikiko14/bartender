import { MenuCategoryType, PreparationArea } from '@shared/enums';
import { MenuCategory } from '../../domain/entities/menu-category.entity';
import { MenuItem } from '../../domain/entities/menu-item.entity';

export interface MenuItemView {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number | null;
  available: boolean;
  preparationArea: PreparationArea;
}

export interface MenuCategoryView {
  id: string;
  name: string;
  type: MenuCategoryType;
  order: number;
  active: boolean;
  image: string | null;
}

export interface MenuCategoryWithItemsView extends MenuCategoryView {
  items: MenuItemView[];
}

export function presentItem(item: MenuItem): MenuItemView {
  const p = item.toPrimitives();
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: p.price,
    image: p.image,
    stock: p.stock,
    available: p.available,
    preparationArea: p.preparationArea,
  };
}

export function presentCategory(category: MenuCategory): MenuCategoryView {
  const p = category.toPrimitives();
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    order: p.order,
    active: p.active,
    image: p.image,
  };
}
