import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuCategory } from '../../domain/entities/menu-category.entity';
import { MenuItem } from '../../domain/entities/menu-item.entity';
import {
  MenuCategoryRepository,
  MenuItemRepository,
} from '../../domain/repositories/menu.repository';
import { MenuCategoryMapper, MenuItemMapper } from '../mappers/menu.mapper';
import {
  MenuCategoryDocument,
  MenuCategoryModel,
  MenuItemDocument,
  MenuItemModel,
} from '../schemas/menu.schema';

const toObjectIds = (ids: string[]) =>
  ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

@Injectable()
export class MenuCategoryMongoRepository extends MenuCategoryRepository {
  constructor(
    @InjectModel(MenuCategoryModel.name) private readonly model: Model<MenuCategoryDocument>,
  ) {
    super();
  }

  async create(category: MenuCategory): Promise<MenuCategory> {
    const created = await this.model.create(MenuCategoryMapper.toPersistence(category));
    return MenuCategoryMapper.toDomain(created);
  }

  async findById(id: string): Promise<MenuCategory | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? MenuCategoryMapper.toDomain(doc) : null;
  }

  async findByBusiness(businessId: string): Promise<MenuCategory[]> {
    const docs = await this.model
      .find({ businessId: new Types.ObjectId(businessId) })
      .sort({ order: 1, createdAt: 1 })
      .exec();
    return docs.map(MenuCategoryMapper.toDomain);
  }

  async update(category: MenuCategory): Promise<MenuCategory> {
    const updated = await this.model
      .findByIdAndUpdate(category.id, MenuCategoryMapper.toPersistence(category), { new: true })
      .exec();
    return MenuCategoryMapper.toDomain(updated as MenuCategoryDocument);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}

@Injectable()
export class MenuItemMongoRepository extends MenuItemRepository {
  constructor(@InjectModel(MenuItemModel.name) private readonly model: Model<MenuItemDocument>) {
    super();
  }

  async create(item: MenuItem): Promise<MenuItem> {
    const created = await this.model.create(MenuItemMapper.toPersistence(item));
    return MenuItemMapper.toDomain(created);
  }

  async findById(id: string): Promise<MenuItem | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? MenuItemMapper.toDomain(doc) : null;
  }

  async findManyByIds(ids: string[]): Promise<MenuItem[]> {
    const docs = await this.model.find({ _id: { $in: toObjectIds(ids) } }).exec();
    return docs.map(MenuItemMapper.toDomain);
  }

  async findByBusiness(businessId: string): Promise<MenuItem[]> {
    const docs = await this.model
      .find({ businessId: new Types.ObjectId(businessId) })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map(MenuItemMapper.toDomain);
  }

  async findByCategory(categoryId: string): Promise<MenuItem[]> {
    const docs = await this.model.find({ categoryId: new Types.ObjectId(categoryId) }).exec();
    return docs.map(MenuItemMapper.toDomain);
  }

  async update(item: MenuItem): Promise<MenuItem> {
    const updated = await this.model
      .findByIdAndUpdate(item.id, MenuItemMapper.toPersistence(item), { new: true })
      .exec();
    return MenuItemMapper.toDomain(updated as MenuItemDocument);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
