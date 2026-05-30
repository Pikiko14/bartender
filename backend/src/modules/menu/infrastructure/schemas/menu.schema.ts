import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MenuCategoryType, PreparationArea } from '@shared/enums';

export type MenuCategoryDocument = HydratedDocument<MenuCategoryModel>;
export type MenuItemDocument = HydratedDocument<MenuItemModel>;

@Schema({ collection: 'menu_categories', timestamps: true })
export class MenuCategoryModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ enum: MenuCategoryType, required: true })
  type!: MenuCategoryType;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: String, default: null })
  image!: string | null;
}

@Schema({ collection: 'menu_items', timestamps: true })
export class MenuItemModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MenuCategoryModel', required: true, index: true })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ type: String, default: null })
  image!: string | null;

  @Prop({ type: Number, default: null })
  stock!: number | null;

  @Prop({ default: true })
  available!: boolean;

  @Prop({ enum: PreparationArea, required: true })
  preparationArea!: PreparationArea;
}

export const MenuCategorySchema = SchemaFactory.createForClass(MenuCategoryModel);
export const MenuItemSchema = SchemaFactory.createForClass(MenuItemModel);
