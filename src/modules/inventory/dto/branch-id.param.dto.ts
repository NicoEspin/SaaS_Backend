import { IsString, Length } from 'class-validator';

export class BranchIdParamDto {
  @IsString()
  @Length(26, 26)
  branchId!: string;
}
