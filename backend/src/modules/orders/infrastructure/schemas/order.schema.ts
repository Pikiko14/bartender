import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus, PreparationArea } from '@shared/enums';

export type OrderDocument = HydratedDocument<OrderModel>;

@Schema({ _id: false })
export class OrderItemSubdoc {
  @Prop({ type: Types.ObjectId, ref: 'MenuItemModel', required: true })
  menuItemId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ enum: PreparationArea, required: true })
  preparationArea!: PreparationArea;

  @Prop({ type: String, default: null })
  notes!: string | null;
}

const OrderItemSubSchema = SchemaFactory.createForClass(OrderItemSubdoc);

@Schema({ collection: 'orders', timestamps: true })
export class OrderModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TableModel', required: true, index: true })
  tableId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  sessionId!: string;

  @Prop({ type: [OrderItemSubSchema], required: true })
  items!: OrderItemSubdoc[];

  @Prop({ required: true })
  total!: number;

  @Prop({ type: [String], enum: PreparationArea, default: [] })
  areas!: PreparationArea[];

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  status!: OrderStatus;

  @Prop({ type: String, default: null })
  notes!: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(OrderModel);
OrderSchema.index({ businessId: 1, status: 1, createdAt: -1 });
