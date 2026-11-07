import { IsMongoId, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*\.zz$/, {
    message: 'address must be a valid .zz address',
  })
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  html!: string;

  @IsMongoId()
  authorId!: string;
}
