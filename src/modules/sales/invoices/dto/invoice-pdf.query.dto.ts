import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class InvoicePdfQueryDto {
  @ApiPropertyOptional({
    description: 'PDF variant.',
    enum: ['internal', 'fiscal'],
    default: 'internal',
  })
  @IsOptional()
  @IsString()
  @IsIn(['internal', 'fiscal'])
  variant?: 'internal' | 'fiscal';
}
