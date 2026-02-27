import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ListProductsQueryDto {
  @ApiPropertyOptional({
    description: 'Free-text search across name/code/category name.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by name (contains, case-insensitive).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by code (contains, case-insensitive).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by category name (contains, case-insensitive).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Filter by category id (26 chars).' })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Max items per page (1..100).',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
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

  @ApiPropertyOptional({ description: 'If provided, filters by isActive.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
