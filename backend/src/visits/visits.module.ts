import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from '../database/schemas/visit.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }])],
  exports: [MongooseModule],
})
export class VisitsModule {}
