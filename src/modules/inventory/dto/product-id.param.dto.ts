import { IsString, Length } from 'class-validator';

export class ProductIdParamDto {
  @IsString()
  @Length(26, 26)
  productId!: string;
}
