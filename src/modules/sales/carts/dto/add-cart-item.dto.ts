import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
