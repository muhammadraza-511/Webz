import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from '../database/schemas/person.schema.js';
import { Site, SiteDocument } from '../database/schemas/site.schema.js';
import { CreateSiteDto } from './dto/create-site.dto.js';

type SiteSearchResult = {
  address: string;
  title: string;
  authorId: SiteDocument['authorId'];
  snippet: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class SitesService {
  constructor(
    @InjectModel(Site.name)
    private readonly siteModel: Model<SiteDocument>,
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
  ) {}

  async findByAddress(address: string): Promise<SiteDocument> {
    const site = await this.siteModel
      .findOne({ address: address.trim().toLowerCase() })
      .populate('authorId', 'name')
      .exec();

    if (!site) {
      throw new NotFoundException(`Site "${address}" was not found`);
    }

    return site;
  }

  async create(dto: CreateSiteDto): Promise<SiteDocument> {
    const address = dto.address.trim().toLowerCase();
    const existing = await this.siteModel.exists({ address });
    if (existing) {
      throw new ConflictException(`Site "${address}" already exists`);
    }

    const authorExists = await this.personModel.exists({ _id: dto.authorId });
    if (!authorExists) {
      throw new NotFoundException(`Person "${dto.authorId}" was not found`);
    }

    try {
      return await this.siteModel.create({
        address,
        title: dto.title.trim(),
        html: dto.html,
        authorId: dto.authorId,
        searchableText: `${dto.title} ${stripHtml(dto.html)}`,
      });
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        throw new ConflictException(`Site "${address}" already exists`);
      }
      throw error;
    }
  }

  async search(query: string): Promise<SiteSearchResult[]> {
    const normalizedQuery = query.trim();
    const expression = new RegExp(escapeRegex(normalizedQuery), 'i');
    const sites = await this.siteModel
      .find({
        $or: [{ title: expression }, { searchableText: expression }],
      })
      .select('address title authorId searchableText')
      .sort({ title: 1 })
      .limit(50)
      .lean()
      .exec();

    return sites.map((site) => {
      const text = site.searchableText;
      const matchIndex = text.toLowerCase().indexOf(normalizedQuery.toLowerCase());
      const start = Math.max(0, matchIndex - 60);
      const end = Math.min(text.length, start + 180);
      return {
        address: site.address,
        title: site.title,
        authorId: site.authorId,
        snippet: `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`,
      };
    });
  }
}
