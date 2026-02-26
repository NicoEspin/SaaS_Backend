import { IsString, Length } from 'class-validator';

export class CategoryIdParamDto {
  @IsString()
  @Length(26, 26)
  id!: string;
}
