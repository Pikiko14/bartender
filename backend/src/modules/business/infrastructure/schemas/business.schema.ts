import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MusicProvider } from '@shared/enums/music-provider.enum';
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

  @Prop({ enum: MusicProvider, default: MusicProvider.YOUTUBE })
  musicProvider!: MusicProvider;

  @Prop({ type: String, default: null })
  spotifyUserId!: string | null;

  @Prop({ type: String, default: null })
  spotifyDisplayName!: string | null;

  @Prop({ type: String, default: null, select: false })
  spotifyAccessToken!: string | null;

  @Prop({ type: String, default: null, select: false })
  spotifyRefreshToken!: string | null;

  @Prop({ type: Date, default: null, select: false })
  spotifyTokenExpiresAt!: Date | null;

  @Prop({ type: String, default: null })
  spotifyDeviceId!: string | null;

  @Prop({ type: Date, default: null })
  spotifyConnectedAt!: Date | null;

  @Prop({ type: Date, default: null })
  spotifyLastSyncAt!: Date | null;
}

export const BusinessSchema = SchemaFactory.createForClass(BusinessModel);
