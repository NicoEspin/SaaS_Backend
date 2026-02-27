import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductAttributeType } from '@prisma/client';

export class CreateCategoryAttributeDefinitionDto {
  @ApiProperty({
    description: 'Attribute key (letters, numbers, underscore).',
    example: 'talle',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_]+$/)
  key!: string;

  @ApiProperty({
    description: 'Attribute label.',
    example: 'Talle',
    maxLength: 120,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ description: 'Attribute type.', enum: ProductAttributeType })
  @IsEnum(ProductAttributeType)
  type!: ProductAttributeType;

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

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name.',
    example: 'Indumentaria',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description:
      'Optional attribute definitions to create along with the category.',
    type: [CreateCategoryAttributeDefinitionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryAttributeDefinitionDto)
  attributeDefinitions?: CreateCategoryAttributeDefinitionDto[];
}
