import { IsString, MinLength } from 'class-validator';

export class BranchIdParamDto {
  @IsString()
  @MinLength(1)
  branchId!: string;
}
