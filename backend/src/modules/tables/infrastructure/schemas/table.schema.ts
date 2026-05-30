import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TableDocument = HydratedDocument<TableModel>;

@Schema({ collection: 'tables', timestamps: true })
export class TableModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ required: true })
  number!: number;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true })
  slug!: string;

  @Prop({ required: true })
  qrUrl!: string;

  @Prop({ default: true })
  active!: boolean;
}

export const TableSchema = SchemaFactory.createForClass(TableModel);
TableSchema.index({ businessId: 1, slug: 1 }, { unique: true });
