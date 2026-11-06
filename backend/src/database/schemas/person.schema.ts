import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PersonDocument = HydratedDocument<Person>;

@Schema({ timestamps: true })
export class Person {
  @Prop({ type: String, required: true, unique: true, trim: true })
  name!: string;
}

export const PersonSchema = SchemaFactory.createForClass(Person);
