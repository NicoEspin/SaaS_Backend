import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerTaxIdType,
  CustomerType,
  CustomerVatCondition,
} from '@prisma/client';

export class CreateCustomerDto {
  @ApiPropertyOptional({
    description:
      'Optional customer code. Must be unique per tenant when provided.',
    example: 'C001',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional({
    description: 'Customer type. Defaults to RETAIL.',
    enum: CustomerType,
    default: CustomerType.RETAIL,
  })
  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @ApiPropertyOptional({
    description: 'Tax id / document number (future billing fields).',
    example: '20123456789',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Tax id type (future billing fields).',
    enum: CustomerTaxIdType,
  })
  @IsOptional()
  @IsEnum(CustomerTaxIdType)
  taxIdType?: CustomerTaxIdType;

  @ApiPropertyOptional({
    description: 'VAT condition (future billing fields).',
    enum: CustomerVatCondition,
  })
  @IsOptional()
  @IsEnum(CustomerVatCondition)
  vatCondition?: CustomerVatCondition;

  @ApiProperty({
    description: 'Customer display name.',
    example: 'Juan Perez',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Email address.',
    example: 'juan@example.com',
    maxLength: 320,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number.',
    example: '+54 11 5555-5555',
    maxLength: 32,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address (free text).',
    example: 'Av. Siempre Viva 742, CABA',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({
    description: 'Free text notes / observations.',
    example: 'Prefers WhatsApp for contact.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Soft active flag. Defaults to true.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
