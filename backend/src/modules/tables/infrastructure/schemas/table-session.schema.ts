import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TableSessionStatus } from '@shared/enums/table-session-status.enum';

export type TableSessionDocument = HydratedDocument<TableSessionModel>;

@Schema({ collection: 'table_sessions', timestamps: true })
export class TableSessionModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TableModel', required: true, index: true })
  tableId!: Types.ObjectId;

  @Prop({ enum: TableSessionStatus, default: TableSessionStatus.OPEN, index: true })
  status!: TableSessionStatus;

  @Prop({ type: Date, required: true })
  openedAt!: Date;

  @Prop({ type: Date, default: null })
  closedAt!: Date | null;
}

export const TableSessionSchema = SchemaFactory.createForClass(TableSessionModel);
TableSessionSchema.index(
  { businessId: 1, tableId: 1, status: 1 },
  { partialFilterExpression: { status: TableSessionStatus.OPEN } },
);
