import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PlanFeature } from '@shared/enums/plan-feature.enum';
import {
  BillingCycle,
  SubscriptionRecordStatus,
} from '../../domain/entities/subscription.entity';

export type PlanDocument = HydratedDocument<PlanModel>;
export type SubscriptionDocument = HydratedDocument<SubscriptionModel>;

@Schema({ _id: false })
export class PlanLimitsSubdoc {
  @Prop({ type: Number, default: null })
  maxTables!: number | null;

  @Prop({ type: Number, default: null })
  maxUsers!: number | null;

  @Prop({ type: Number, default: null })
  maxMenuItems!: number | null;
}

const PlanLimitsSchema = SchemaFactory.createForClass(PlanLimitsSubdoc);

@Schema({ collection: 'plans', timestamps: true })
export class PlanModel {
  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, min: 0 })
  priceMonthly!: number;

  @Prop({ required: true, min: 0 })
  priceYearly!: number;

  @Prop({ type: [String], enum: PlanFeature, default: [] })
  features!: PlanFeature[];

  @Prop({ type: PlanLimitsSchema, default: {} })
  limits!: PlanLimitsSubdoc;

  @Prop({ default: 0 })
  trialDays!: number;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: false })
  highlighted!: boolean;
}

@Schema({ collection: 'subscriptions', timestamps: true })
export class SubscriptionModel {
  @Prop({ required: true, unique: true, index: true })
  businessId!: string;

  @Prop({ required: true, index: true })
  planId!: string;

  @Prop({ enum: SubscriptionRecordStatus, default: SubscriptionRecordStatus.TRIALING })
  status!: SubscriptionRecordStatus;

  @Prop({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle!: BillingCycle;

  @Prop({ required: true })
  currentPeriodStart!: Date;

  @Prop({ required: true })
  currentPeriodEnd!: Date;

  @Prop({ type: Date, default: null })
  canceledAt!: Date | null;
}

export const PlanSchema = SchemaFactory.createForClass(PlanModel);
export const SubscriptionSchema = SchemaFactory.createForClass(SubscriptionModel);
