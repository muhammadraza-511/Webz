import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from '../database/schemas/person.schema.js';
import { Site, SiteSchema } from '../database/schemas/site.schema.js';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Site.name, schema: SiteSchema },
      { name: Person.name, schema: PersonSchema },
    ]),
  ],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [MongooseModule],
})
export class SitesModule {}
