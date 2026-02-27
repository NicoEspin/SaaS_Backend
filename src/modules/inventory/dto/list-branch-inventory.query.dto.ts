import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class ListBranchInventoryQueryDto {
  @ApiPropertyOptional({
    description: 'Max items per page (1..100).',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (id < cursor).',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  cursor?: string;
}
