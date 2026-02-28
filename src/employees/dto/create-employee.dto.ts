import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Employee full name.',
    example: 'Jane Doe',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({
    description: 'Employee email (unique globally).',
    example: 'jane@acme.com',
    maxLength: 320,
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description: 'Employee password (min 8 chars).',
    example: 'password123',
    maxLength: 200,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;

  @ApiProperty({
    description: 'Employee role within the tenant.',
    enum: MembershipRole,
    example: MembershipRole.MANAGER,
  })
  @IsEnum(MembershipRole)
  role!: MembershipRole;

  @ApiProperty({
    description: 'Initial active branch id (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  branchId!: string;
}
