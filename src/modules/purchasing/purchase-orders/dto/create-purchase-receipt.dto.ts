import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CreatePurchaseReceiptItemDto {
  @ApiProperty({
    description: 'Purchase order item id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  purchaseOrderItemId!: string;

  @ApiProperty({ description: 'Quantity received (>= 1).', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityReceived!: number;

  @ApiProperty({ description: 'Actual unit cost (>= 0).', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualUnitCost!: number;
}

export class CreatePurchaseReceiptDto {
  @ApiProperty({ description: 'Received at (ISO date-time string).' })
  @IsDateString()
  receivedAt!: string;

  @ApiPropertyOptional({ description: 'Notes.', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Future link to payable record (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  payableId?: string;

  @ApiProperty({
    description: 'Receipt items.',
    type: [CreatePurchaseReceiptItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReceiptItemDto)
  items!: CreatePurchaseReceiptItemDto[];
}

export type { CreatePurchaseReceiptItemDto };
