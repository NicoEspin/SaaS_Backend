import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ description: 'Cursor (invoice id) for pagination.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  cursor?: string;

  @ApiPropertyOptional({ description: 'Max items to return (default 50).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Filter by customer id.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  customerId?: string;
}
