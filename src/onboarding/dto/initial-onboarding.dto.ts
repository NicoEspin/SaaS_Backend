import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class InitialOnboardingTenantDto {
  @ApiProperty({
    description: 'Tenant display name.',
    example: 'Acme SA',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Tenant slug (used for login).',
    example: 'acme',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/i, {
    message:
      'slug must be 1-64 chars and contain only letters, numbers, and hyphens',
  })
  slug!: string;
}

export class InitialOnboardingAdminDto {
  @ApiProperty({
    description: 'Admin full name.',
    example: 'Admin Acme',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({
    description: 'Admin email.',
    example: 'admin@acme.com',
    maxLength: 320,
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description: 'Admin password (min 8 chars).',
    example: 'password123',
    maxLength: 200,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

export class InitialOnboardingBranchDto {
  @ApiProperty({
    description: 'Initial branch name.',
    example: 'Sucursal 1',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class InitialOnboardingDto {
  @ApiProperty({
    description: 'Tenant to create.',
    type: InitialOnboardingTenantDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingTenantDto)
  tenant!: InitialOnboardingTenantDto;

  @ApiPropertyOptional({
    description:
      'Optional initial branch to create. If omitted, a default branch may be created.',
    type: InitialOnboardingBranchDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingBranchDto)
  branch?: InitialOnboardingBranchDto;

  @ApiProperty({
    description: 'Admin user to create.',
    type: InitialOnboardingAdminDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingAdminDto)
  admin!: InitialOnboardingAdminDto;
}
