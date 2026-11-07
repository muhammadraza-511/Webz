import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchSitesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;
}
