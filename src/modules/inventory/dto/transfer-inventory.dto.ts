import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Length,
  MaxLength,
  Min,
  IsOptional,
} from 'class-validator';

export class TransferInventoryDto {
  @ApiProperty({
    description: 'Destination branch id (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  toBranchId!: string;

  @ApiProperty({
    description: 'Product id (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  productId!: string;

  @ApiProperty({
    description: 'Quantity to transfer (>= 1).',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional notes.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
