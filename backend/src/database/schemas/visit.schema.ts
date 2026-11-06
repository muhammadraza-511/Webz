import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VisitDocument = HydratedDocument<Visit>;

export enum ArrivedVia {
  Typed = 'typed',
  Link = 'link',
  Back = 'back',
  Forward = 'forward',
  History = 'history',
  Search = 'search',
}

@Schema({ timestamps: false })
export class Visit {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Person', index: true })
  personId!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  address!: string;

  @Prop({ type: Types.ObjectId, ref: 'Site', default: null })
  siteId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, enum: Object.values(ArrivedVia) })
  arrivedVia!: ArrivedVia;

  @Prop({ type: Date, required: true, index: true })
  visitedAt!: Date;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ personId: 1, visitedAt: -1 });
