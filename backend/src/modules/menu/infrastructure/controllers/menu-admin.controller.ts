import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/dto/category.dto';
import { CreateItemDto, UpdateItemDto } from '../../application/dto/item.dto';
import { presentCategory, presentItem } from '../../application/presenters/menu.presenter';
import { ManageCategoriesUseCase } from '../../application/use-cases/manage-categories.use-case';
import { ManageItemsUseCase } from '../../application/use-cases/manage-items.use-case';

@Controller('menu')
export class MenuAdminController {
  constructor(
    private readonly categories: ManageCategoriesUseCase,
    private readonly items: ManageItemsUseCase,
  ) {}

  // ---- Categorías ----
  @Get('categories')
  @RequirePermissions(Permission.MENU_VIEW)
  async listCategories(@CurrentUser('businessId') businessId: string) {
    return (await this.categories.list(businessId)).map(presentCategory);
  }

  @Post('categories')
  @RequirePermissions(Permission.MENU_MANAGE)
  async createCategory(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return presentCategory(await this.categories.create(businessId, dto));
  }

  @Patch('categories/:id')
  @RequirePermissions(Permission.MENU_MANAGE)
  async updateCategory(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return presentCategory(await this.categories.update(businessId, id, dto));
  }

  @Delete('categories/:id')
  @RequirePermissions(Permission.MENU_MANAGE)
  async removeCategory(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    await this.categories.remove(businessId, id);
    return { deleted: true };
  }

  // ---- Productos ----
  @Get('items')
  @RequirePermissions(Permission.MENU_VIEW)
  async listItems(@CurrentUser('businessId') businessId: string) {
    return (await this.items.list(businessId)).map(presentItem);
  }

  @Post('items')
  @RequirePermissions(Permission.MENU_MANAGE)
  async createItem(@CurrentUser('businessId') businessId: string, @Body() dto: CreateItemDto) {
    return presentItem(await this.items.create(businessId, dto));
  }

  @Patch('items/:id')
  @RequirePermissions(Permission.MENU_MANAGE)
  async updateItem(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return presentItem(await this.items.update(businessId, id, dto));
  }

  @Delete('items/:id')
  @RequirePermissions(Permission.MENU_MANAGE)
  async removeItem(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    await this.items.remove(businessId, id);
    return { deleted: true };
  }
}
