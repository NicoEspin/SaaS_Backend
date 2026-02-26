import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Length,
  MaxLength,
  Min,
  IsOptional,
} from 'class-validator';

export class TransferInventoryDto {
  @IsString()
  @Length(26, 26)
  toBranchId!: string;

  @IsString()
  @Length(26, 26)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
