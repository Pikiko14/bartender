import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { MenuCategory } from '../../domain/entities/menu-category.entity';
import {
  MENU_CATEGORY_REPOSITORY,
  MenuCategoryRepository,
} from '../../domain/repositories/menu.repository';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class ManageCategoriesUseCase {
  constructor(
    @Inject(MENU_CATEGORY_REPOSITORY) private readonly categories: MenuCategoryRepository,
  ) {}

  list(businessId: string): Promise<MenuCategory[]> {
    return this.categories.findByBusiness(businessId);
  }

  create(businessId: string, dto: CreateCategoryDto): Promise<MenuCategory> {
    const category = new MenuCategory({
      id: uuid(),
      businessId,
      name: dto.name,
      type: dto.type,
      order: dto.order ?? 0,
      active: true,
      image: dto.image ?? null,
    });
    return this.categories.create(category);
  }

  async update(businessId: string, id: string, dto: UpdateCategoryDto): Promise<MenuCategory> {
    const category = await this.getOwned(businessId, id);
    category.update(dto);
    return this.categories.update(category);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.getOwned(businessId, id);
    await this.categories.delete(id);
  }

  private async getOwned(businessId: string, id: string): Promise<MenuCategory> {
    const category = await this.categories.findById(id);
    if (!category) throw new EntityNotFoundException('Categoría', id);
    if (category.businessId !== businessId) {
      throw new ForbiddenDomainException('La categoría no pertenece a tu negocio.');
    }
    return category;
  }
}
