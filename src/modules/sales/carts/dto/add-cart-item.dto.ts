import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Product id to add (26 chars).',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
  })
  @IsString()
  @MinLength(1)
  productId!: string;

  @ApiProperty({
    description: 'Quantity to add (>= 1).',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}
