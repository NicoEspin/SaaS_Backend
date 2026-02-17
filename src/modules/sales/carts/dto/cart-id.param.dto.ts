import { IsString, MinLength } from 'class-validator';

export class CartIdParamDto {
  @IsString()
  @MinLength(1)
  cartId!: string;
}
