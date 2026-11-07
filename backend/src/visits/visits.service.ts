import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from '../database/schemas/person.schema.js';
import { Site, SiteDocument } from '../database/schemas/site.schema.js';
import { Visit, VisitDocument } from '../database/schemas/visit.schema.js';
import { CreateVisitDto } from './dto/create-visit.dto.js';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
    @InjectModel(Site.name)
    private readonly siteModel: Model<SiteDocument>,
  ) {}

  async create(dto: CreateVisitDto): Promise<VisitDocument> {
    const personExists = await this.personModel.exists({ _id: dto.personId });
    if (!personExists) {
      throw new NotFoundException(`Person "${dto.personId}" was not found`);
    }

    const address = dto.address.trim().toLowerCase();
    const site = await this.siteModel.findOne({ address }).select('_id').exec();

    return this.visitModel.create({
      personId: dto.personId,
      address,
      siteId: site?._id ?? null,
      arrivedVia: dto.arrivedVia,
      visitedAt: dto.visitedAt ? new Date(dto.visitedAt) : new Date(),
    });
  }

  async history(personId: string, limit: number): Promise<VisitDocument[]> {
    const personExists = await this.personModel.exists({ _id: personId });
    if (!personExists) {
      throw new NotFoundException(`Person "${personId}" was not found`);
    }

    return this.visitModel
      .find({ personId })
      .sort({ visitedAt: -1 })
      .limit(limit)
      .populate('siteId', 'address title')
      .exec();
  }
}
