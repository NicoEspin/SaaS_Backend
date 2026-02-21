import { IsOptional, IsString, Length } from 'class-validator';

export class ListProductAttributeDefinitionsQueryDto {
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;
}
