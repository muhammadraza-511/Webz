import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from '../database/schemas/person.schema.js';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
  ) {}

  findAll(): Promise<PersonDocument[]> {
    return this.personModel.find().sort({ name: 1 }).exec();
  }

  findById(id: string): Promise<PersonDocument | null> {
    return this.personModel.findById(id).exec();
  }
}
