import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class PurchaseOrderIdParamDto {
  @ApiProperty({
    description: 'Purchase order id (26 chars).',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  id!: string;
}
