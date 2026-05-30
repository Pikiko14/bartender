import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessModule } from '@modules/business/business.module';
import {
  MENU_CATEGORY_REPOSITORY,
  MENU_ITEM_REPOSITORY,
} from './domain/repositories/menu.repository';
import { GetMenuUseCase } from './application/use-cases/get-menu.use-case';
import { ManageCategoriesUseCase } from './application/use-cases/manage-categories.use-case';
import { ManageItemsUseCase } from './application/use-cases/manage-items.use-case';
import { MenuAdminController } from './infrastructure/controllers/menu-admin.controller';
import { PublicMenuController } from './infrastructure/controllers/public-menu.controller';
import {
  MenuCategoryMongoRepository,
  MenuItemMongoRepository,
} from './infrastructure/repositories/menu.mongo.repository';
import {
  MenuCategoryModel,
  MenuCategorySchema,
  MenuItemModel,
  MenuItemSchema,
} from './infrastructure/schemas/menu.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuCategoryModel.name, schema: MenuCategorySchema },
      { name: MenuItemModel.name, schema: MenuItemSchema },
    ]),
    BusinessModule,
  ],
  controllers: [MenuAdminController, PublicMenuController],
  providers: [
    ManageCategoriesUseCase,
    ManageItemsUseCase,
    GetMenuUseCase,
    { provide: MENU_CATEGORY_REPOSITORY, useClass: MenuCategoryMongoRepository },
    { provide: MENU_ITEM_REPOSITORY, useClass: MenuItemMongoRepository },
  ],
  exports: [MENU_ITEM_REPOSITORY],
})
export class MenuModule {}
