import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from '../database/schemas/person.schema.js';
import { PeopleController } from './people.controller.js';
import { PeopleService } from './people.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Person.name, schema: PersonSchema }])],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [MongooseModule],
})
export class PeopleModule {}
