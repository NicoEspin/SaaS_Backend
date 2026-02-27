import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CartIdParamDto {
  @ApiProperty({
    description: 'Cart id (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
  })
  @IsString()
  @MinLength(1)
  cartId!: string;
}
