import { IsEnum, IsString, IsOptional, MinLength } from 'class-validator';
import { ApprovalAction } from '../entities/approval.entity';

export class CreateApprovalDto {
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @IsString()
  @IsOptional()
  @MinLength(3)
  comment?: string;
}