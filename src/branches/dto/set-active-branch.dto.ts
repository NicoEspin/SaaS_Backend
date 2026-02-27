import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActiveBranchDto {
  @ApiProperty({
    description:
      'Branch id (26 chars) to set as active for the current membership.',
    example: '01J1QZQ0VQ8J7TQH0YV3A1BCDE',
    minLength: 26,
    maxLength: 26,
  })
  @IsString()
  @Length(26, 26)
  branchId!: string;
}
