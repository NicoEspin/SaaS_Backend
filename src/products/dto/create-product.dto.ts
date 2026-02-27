import {
  IsArray,
  IsObject,
  IsBoolean,
  IsOptional,
  IsInt,
  IsNumber,
  IsString,
  Length,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class InitialStockEntryDto {
  @ApiProperty({
    description: 'Branch id (26 chars) to initialize stock for.',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  branchId!: string;

  @ApiProperty({
    description: 'Initial stock on hand (>= 0).',
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockOnHand!: number;

  @ApiProperty({
    description: 'Initial price (>= 0).',
    example: 1000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product code (unique per tenant).',
    example: 'SKU-001',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    description: 'Product name.',
    example: 'Remera Lisa',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Category id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Description.', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Soft active flag. Defaults to true.',
    default: true,
  })
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

  @ApiPropertyOptional({
    description: 'Optional initial stock entries to initialize inventories.',
    type: [InitialStockEntryDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockEntryDto)
  initialStock?: InitialStockEntryDto[];
}
