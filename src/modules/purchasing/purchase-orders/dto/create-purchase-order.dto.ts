import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class NewProductDto {
  @ApiProperty({
    description: 'Product code (unique per tenant).',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({ description: 'Product name.', maxLength: 200 })
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
}

class CreatePurchaseOrderItemDto {
  @ApiPropertyOptional({ description: 'Existing product id (26 chars).' })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  productId?: string;

  @ApiPropertyOptional({ description: 'New product to create for this line.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewProductDto)
  newProduct?: NewProductDto;

  @ApiProperty({ description: 'Quantity ordered (>= 1).', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityOrdered!: number;

  @ApiProperty({ description: 'Agreed unit cost (>= 0).', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedUnitCost!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({
    description: 'Branch id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  branchId!: string;

  @ApiProperty({
    description: 'Supplier id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  supplierId!: string;

  @ApiPropertyOptional({ description: 'Expected delivery date/time.' })
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiPropertyOptional({ description: 'Notes.', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiProperty({
    description: 'Order items.',
    type: [CreatePurchaseOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}

export type { CreatePurchaseOrderItemDto, NewProductDto };
