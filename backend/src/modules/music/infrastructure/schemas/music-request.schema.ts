import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MusicProvider } from '@shared/enums/music-provider.enum';
import { MusicRequestStatus } from '../../domain/entities/music-request.entity';

export type MusicRequestDocument = HydratedDocument<MusicRequestModel>;

@Schema({ collection: 'music_requests', timestamps: true })
export class MusicRequestModel {
  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', required: true, index: true })
  businessId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  youtubeId!: string;

  @Prop({ type: String, default: null })
  thumbnail!: string | null;

  @Prop({ type: String, default: null })
  channelTitle!: string | null;

  @Prop({ type: Number, default: null })
  durationSeconds!: number | null;

  @Prop({ required: true })
  requestedBy!: string;

  @Prop({ enum: MusicRequestStatus, default: MusicRequestStatus.PENDING, index: true })
  status!: MusicRequestStatus;

  @Prop({ default: 0 })
  priority!: number;

  @Prop({ default: 0 })
  votes!: number;

  @Prop({ type: [String], default: [] })
  voters!: string[];

  @Prop({ type: Date, default: null })
  playedAt!: Date | null;

  @Prop({ enum: MusicProvider, default: MusicProvider.YOUTUBE, index: true })
  provider!: MusicProvider;

  @Prop({ type: String, default: null, index: true })
  spotifyId!: string | null;

  @Prop({ type: String, default: null })
  artist!: string | null;

  @Prop({ type: String, default: null })
  album!: string | null;
}

export const MusicRequestSchema = SchemaFactory.createForClass(MusicRequestModel);
MusicRequestSchema.index({ businessId: 1, status: 1, priority: -1, votes: -1, createdAt: 1 });
