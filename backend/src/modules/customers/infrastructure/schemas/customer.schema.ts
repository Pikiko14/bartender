import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerDocument = HydratedDocument<CustomerModel>;

@Schema({ collection: 'customers', timestamps: true })
export class CustomerModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, index: true })
  document!: string;

  @Prop({ type: String, default: null, trim: true })
  phone!: string | null;

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  email!: string | null;

  @Prop({ type: String, default: null })
  notes!: string | null;
}

export const CustomerSchema = SchemaFactory.createForClass(CustomerModel);
CustomerSchema.index({ businessId: 1, name: 1 });
CustomerSchema.index({ businessId: 1, document: 1 });
