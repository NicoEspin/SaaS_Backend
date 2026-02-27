import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerTaxIdType,
  CustomerType,
  CustomerVatCondition,
} from '@prisma/client';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer code. Send null to clear it.',
    example: 'C001',
    maxLength: 64,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string | null;

  @ApiPropertyOptional({
    description: 'Customer type.',
    enum: CustomerType,
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({
    description: 'Tax id / document number. Send null to clear it.',
    example: '20123456789',
    maxLength: 32,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  taxId?: string | null;

  @ApiPropertyOptional({
    description: 'Tax id type. Send null to clear it.',
    enum: CustomerTaxIdType,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CustomerTaxIdType)
  taxIdType?: CustomerTaxIdType | null;

  @ApiPropertyOptional({
    description: 'VAT condition. Send null to clear it.',
    enum: CustomerVatCondition,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(CustomerVatCondition)
  vatCondition?: CustomerVatCondition | null;

  @ApiPropertyOptional({
    description: 'Customer display name.',
    example: 'Juan Perez',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Email address. Send null to clear it.',
    example: 'juan@example.com',
    maxLength: 320,
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Phone number. Send null to clear it.',
    example: '+54 11 5555-5555',
    maxLength: 32,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Customer address. Send null to clear it.',
    example: 'Av. Siempre Viva 742, CABA',
    maxLength: 300,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({
    description: 'Free text notes. Send null to clear it.',
    example: 'Prefers WhatsApp for contact.',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Soft active flag (can be used to reactivate).',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
