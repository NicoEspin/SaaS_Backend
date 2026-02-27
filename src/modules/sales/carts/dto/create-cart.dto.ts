import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCartDto {
  @ApiPropertyOptional({
    description:
      'Optional customer id. Must exist in the same tenant and be active (isActive=true).',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  customerId?: string;
}
