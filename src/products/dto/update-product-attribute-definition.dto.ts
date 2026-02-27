import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductAttributeType } from '@prisma/client';

export class UpdateProductAttributeDefinitionDto {
  @ApiPropertyOptional({
    description: 'Move definition to another category (26 chars).',
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Attribute key (lowercase letters, numbers, underscore).',
    example: 'talle',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z0-9_]+$/)
  key?: string;

  @ApiPropertyOptional({
    description: 'Attribute label.',
    example: 'Talle',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description: 'Attribute type.',
    enum: ProductAttributeType,
  })
  @IsOptional()
  @IsEnum(ProductAttributeType)
  type?: ProductAttributeType;

  @ApiPropertyOptional({
    description: 'Optional unit.',
    example: 'cm',
    maxLength: 24,
  })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string;

  @ApiPropertyOptional({ description: 'Whether the attribute is required.' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the attribute is visible in product table.',
  })
  @IsOptional()
  @IsBoolean()
  isVisibleInTable?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order (0..1000).',
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Options for ENUM attributes. Required when type=ENUM.',
    example: ['S', 'M', 'L'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(64, { each: true })
  options?: string[];
}
