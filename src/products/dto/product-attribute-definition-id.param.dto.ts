import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductAttributeDefinitionIdParamDto {
  @ApiProperty({
    description: 'Attribute definition id (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  id!: string;
}
