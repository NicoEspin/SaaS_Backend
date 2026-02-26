import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class AdjustInventoryDto {
  @IsString()
  @Length(26, 26)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
