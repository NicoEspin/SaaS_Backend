import { ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Employee full name.',
    example: 'Jane Doe',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Employee role within the tenant.',
    enum: MembershipRole,
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiPropertyOptional({
    description: 'Move employee to this branch (sets activeBranchId).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  branchId?: string;
}
