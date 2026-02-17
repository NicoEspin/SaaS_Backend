import { IsInt, Min } from 'class-validator';

export class SetCartItemQuantityDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}
