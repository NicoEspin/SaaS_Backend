import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCartItemQuantityDto {
  @ApiProperty({
    description: 'New quantity. Use 0 to remove the item.',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  quantity!: number;
}
