import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ListEmployeesQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor (membership id) for pagination.',
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  cursor?: string;

  @ApiPropertyOptional({ description: 'Max items to return (default 100).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Free text search (email or fullName).',
    example: 'jane',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by role.', enum: MembershipRole })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({
    description: 'Filter by active branch id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  branchId?: string;
}
