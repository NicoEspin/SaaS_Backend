import { IsString, Length } from 'class-validator';

export class ProductAttributeDefinitionIdParamDto {
  @IsString()
  @Length(26, 26)
  id!: string;
}
