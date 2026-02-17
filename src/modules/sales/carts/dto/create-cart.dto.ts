import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCartDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  customerId?: string;
}
