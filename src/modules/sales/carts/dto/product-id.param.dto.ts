import { IsString, MinLength } from 'class-validator';

export class ProductIdParamDto {
  @IsString()
  @MinLength(1)
  productId!: string;
}
