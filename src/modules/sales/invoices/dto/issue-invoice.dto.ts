import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class IssueInvoiceDto {
  @ApiProperty({
    description: 'Invoice document type.',
    enum: ['A', 'B'],
  })
  @IsString()
  @IsIn(['A', 'B'])
  docType!: 'A' | 'B';

  @ApiPropertyOptional({
    description:
      'Issuance mode. INTERNAL is supported now. ARCA will be added soon.',
    enum: ['INTERNAL', 'ARCA'],
    default: 'INTERNAL',
  })
  @IsOptional()
  @IsString()
  @IsIn(['INTERNAL', 'ARCA'])
  mode?: 'INTERNAL' | 'ARCA';
}
