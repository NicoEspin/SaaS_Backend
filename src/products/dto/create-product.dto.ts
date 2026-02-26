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

class InitialStockEntryDto {
  @IsString()
  @Length(26, 26)
  branchId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockOnHand!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockEntryDto)
  initialStock?: InitialStockEntryDto[];
}
