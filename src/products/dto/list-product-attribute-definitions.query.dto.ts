import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProductAttributeDefinitionsQueryDto {
  @ApiPropertyOptional({
    description: 'Optional category id (26 chars) to filter by.',
  })
  @IsOptional()
  @IsString()
  @Length(26, 26)
  categoryId?: string;
}
