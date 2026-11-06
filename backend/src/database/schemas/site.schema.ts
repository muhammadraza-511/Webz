import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SiteDocument = HydratedDocument<Site>;

@Schema({ timestamps: true })
export class Site {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  address!: string;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true })
  html!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Person' })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  searchableText!: string;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
SiteSchema.index({ title: 'text', searchableText: 'text' });
