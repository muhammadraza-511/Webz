import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ArrivedVia } from '../../database/schemas/visit.schema.js';

export class CreateVisitDto {
  @IsMongoId()
  personId!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*\.zz$/)
  address!: string;

  @IsEnum(ArrivedVia)
  arrivedVia!: ArrivedVia;

  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}
