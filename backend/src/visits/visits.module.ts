import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from '../database/schemas/person.schema.js';
import { Site, SiteSchema } from '../database/schemas/site.schema.js';
import { Visit, VisitSchema } from '../database/schemas/visit.schema.js';
import { VisitsController } from './visits.controller.js';
import { VisitsService } from './visits.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Visit.name, schema: VisitSchema },
      { name: Person.name, schema: PersonSchema },
      { name: Site.name, schema: SiteSchema },
    ]),
  ],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [MongooseModule],
})
export class VisitsModule {}
