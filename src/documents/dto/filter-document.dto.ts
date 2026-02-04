import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentStatus } from '../../common/enums/document-status.enum';

export class FilterDocumentDto {
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsUUID()
  @IsOptional()
  creatorId?: string;
}