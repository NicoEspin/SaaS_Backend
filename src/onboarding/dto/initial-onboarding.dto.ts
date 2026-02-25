import { Type } from 'class-transformer';
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
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

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
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

export class InitialOnboardingBranchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class InitialOnboardingDto {
  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingTenantDto)
  tenant!: InitialOnboardingTenantDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingBranchDto)
  branch?: InitialOnboardingBranchDto;

  @IsObject()
  @ValidateNested()
  @Type(() => InitialOnboardingAdminDto)
  admin!: InitialOnboardingAdminDto;
}
