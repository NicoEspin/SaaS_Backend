import { IsOptional, IsString, MinLength } from 'class-validator';

export class CheckoutCartDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  customerId?: string;
}
