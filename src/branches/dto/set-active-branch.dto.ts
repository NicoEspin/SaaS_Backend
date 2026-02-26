import { IsString, Length } from 'class-validator';

export class SetActiveBranchDto {
  @IsString()
  @Length(26, 26)
  branchId!: string;
}
