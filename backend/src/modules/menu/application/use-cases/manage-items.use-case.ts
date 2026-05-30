import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { MenuItem } from '../../domain/entities/menu-item.entity';
import {
  MENU_CATEGORY_REPOSITORY,
  MENU_ITEM_REPOSITORY,
  MenuCategoryRepository,
  MenuItemRepository,
} from '../../domain/repositories/menu.repository';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Injectable()
export class ManageItemsUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly items: MenuItemRepository,
    @Inject(MENU_CATEGORY_REPOSITORY) private readonly categories: MenuCategoryRepository,
  ) {}

  list(businessId: string): Promise<MenuItem[]> {
    return this.items.findByBusiness(businessId);
  }

  async create(businessId: string, dto: CreateItemDto): Promise<MenuItem> {
    await this.assertCategory(businessId, dto.categoryId);
    const item = new MenuItem({
      id: uuid(),
      businessId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      image: dto.image ?? null,
      stock: dto.stock ?? null,
      available: true,
      preparationArea: dto.preparationArea,
    });
    return this.items.create(item);
  }

  async update(businessId: string, id: string, dto: UpdateItemDto): Promise<MenuItem> {
    const item = await this.getOwned(businessId, id);
    if (dto.categoryId) {
      await this.assertCategory(businessId, dto.categoryId);
    }
    item.update(dto);
    return this.items.update(item);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.getOwned(businessId, id);
    await this.items.delete(id);
  }

  private async getOwned(businessId: string, id: string): Promise<MenuItem> {
    const item = await this.items.findById(id);
    if (!item) throw new EntityNotFoundException('Producto', id);
    if (item.businessId !== businessId) {
      throw new ForbiddenDomainException('El producto no pertenece a tu negocio.');
    }
    return item;
  }

  private async assertCategory(businessId: string, categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category || category.businessId !== businessId) {
      throw new EntityNotFoundException('Categoría', categoryId);
    }
  }
}
