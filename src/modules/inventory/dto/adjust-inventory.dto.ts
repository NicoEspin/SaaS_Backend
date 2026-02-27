import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class AdjustInventoryDto {
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
    description: 'Quantity delta. Can be negative or positive.',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional({ description: 'Optional notes.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
