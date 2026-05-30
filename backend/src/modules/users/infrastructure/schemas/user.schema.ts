import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Permission, Role } from '@shared/enums';

export type UserDocument = HydratedDocument<UserModel>;

@Schema({ collection: 'users', timestamps: true })
export class UserModel {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: Role, default: Role.OWNER })
  role!: Role;

  @Prop({ type: Types.ObjectId, ref: 'BusinessModel', default: null, index: true })
  businessId!: Types.ObjectId | null;

  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: [String], enum: Permission, default: [] })
  extraPermissions!: Permission[];

  @Prop({ type: [String], enum: Permission, default: [] })
  revokedPermissions!: Permission[];
}

export const UserSchema = SchemaFactory.createForClass(UserModel);
