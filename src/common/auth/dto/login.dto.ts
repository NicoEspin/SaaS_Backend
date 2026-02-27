import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Tenant slug.', example: 'acme' })
  @IsString()
  @MinLength(1)
  tenantSlug!: string;

  @ApiProperty({ description: 'User email.', example: 'admin@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password.', example: 'password123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
