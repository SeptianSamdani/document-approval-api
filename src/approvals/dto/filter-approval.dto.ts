import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApprovalAction } from '../entities/approval.entity';

export class FilterApprovalDto {
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @IsUUID()
  @IsOptional()
  approverId?: string;

  @IsEnum(ApprovalAction)
  @IsOptional()
  action?: ApprovalAction;
}