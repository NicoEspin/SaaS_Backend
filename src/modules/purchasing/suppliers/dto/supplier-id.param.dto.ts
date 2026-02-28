import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SupplierIdParamDto {
  @ApiProperty({
    description: 'Supplier id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  id!: string;
}
