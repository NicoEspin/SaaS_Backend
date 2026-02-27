import {
  IsObject,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product code.',
    example: 'SKU-001',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({
    description: 'Product name.',
    example: 'Remera Lisa',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Category id (26 chars). Use null to clear.',
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Description. Use empty string to clear.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Soft active flag.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Product custom attributes (key/value). Validated against category definitions.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
