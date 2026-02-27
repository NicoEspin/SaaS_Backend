import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search by category name.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;

  @ApiPropertyOptional({
    description: 'Max items per page (1..200).',
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (id < cursor).',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  cursor?: string;
}
