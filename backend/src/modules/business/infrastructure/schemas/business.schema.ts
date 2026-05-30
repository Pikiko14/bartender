import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus } from '../../domain/entities/business.entity';

export type BusinessDocument = HydratedDocument<BusinessModel>;

@Schema({ collection: 'businesses', timestamps: true })
export class BusinessModel {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String, default: null })
  logo!: string | null;

  @Prop({ type: String, default: null })
  cover!: string | null;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'UserModel', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  subscriptionStatus!: SubscriptionStatus;
}

export const BusinessSchema = SchemaFactory.createForClass(BusinessModel);
