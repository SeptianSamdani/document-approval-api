import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Approval, ApprovalAction } from './entities/approval.entity';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { FilterApprovalDto } from './dto/filter-approval.dto';
import { DocumentsService } from '../documents/documents.service';
import { DocumentStatus } from '../common/enums/document-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
    private documentsService: DocumentsService,
  ) {}

  async create(
    documentId: string,
    createApprovalDto: CreateApprovalDto,
    approverId: string,
    approverRole: UserRole,
  ): Promise<Approval> {
    // Check if user has permission to approve
    if (approverRole !== UserRole.APPROVER && approverRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only approvers and admins can approve/reject documents',
      );
    }

    // Get document
    const document = await this.documentsService.findOne(documentId);

    // Check if document is in PENDING status
    if (document.status !== DocumentStatus.PENDING) {
      throw new BadRequestException(
        'Only documents in PENDING status can be approved/rejected',
      );
    }

    // Check if approver is not the creator
    if (document.creatorId === approverId) {
      throw new BadRequestException('You cannot approve your own document');
    }

    // Check if already approved/rejected by this user
    const existingApproval = await this.approvalsRepository.findOne({
      where: {
        documentId,
        approverId,
      },
    });

    if (existingApproval) {
      throw new BadRequestException(
        'You have already approved/rejected this document',
      );
    }

    // Create approval
    const approval = this.approvalsRepository.create({
      documentId,
      approverId,
      action: createApprovalDto.action,
      comment: createApprovalDto.comment,
    });

    const savedApproval = await this.approvalsRepository.save(approval);

    // Update document status based on action
    const newStatus =
      createApprovalDto.action === ApprovalAction.APPROVED
        ? DocumentStatus.APPROVED
        : DocumentStatus.REJECTED;

    await this.documentsService.updateStatus(documentId, newStatus);

    return savedApproval;
  }

  async findAll(filterDto?: FilterApprovalDto): Promise<Approval[]> {
    const query = this.approvalsRepository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.document', 'document')
      .leftJoinAndSelect('approval.approver', 'approver')
      .leftJoinAndSelect('document.creator', 'creator')
      .select([
        'approval',
        'document.id',
        'document.title',
        'document.status',
        'approver.id',
        'approver.name',
        'approver.email',
        'creator.id',
        'creator.name',
        'creator.email',
      ]);

    if (filterDto?.documentId) {
      query.andWhere('approval.documentId = :documentId', {
        documentId: filterDto.documentId,
      });
    }

    if (filterDto?.approverId) {
      query.andWhere('approval.approverId = :approverId', {
        approverId: filterDto.approverId,
      });
    }

    if (filterDto?.action) {
      query.andWhere('approval.action = :action', {
        action: filterDto.action,
      });
    }

    return query.orderBy('approval.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Approval> {
    const approval = await this.approvalsRepository.findOne({
      where: { id },
      relations: ['document', 'approver', 'document.creator'],
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    return approval;
  }

  async findByDocument(documentId: string): Promise<Approval[]> {
    return this.approvalsRepository.find({
      where: { documentId },
      relations: ['approver'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMyApprovals(approverId: string): Promise<Approval[]> {
    return this.approvalsRepository.find({
      where: { approverId },
      relations: ['document', 'document.creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getApprovalStats(userId?: string) {
    const query = this.approvalsRepository.createQueryBuilder('approval');

    if (userId) {
      query.where('approval.approverId = :userId', { userId });
    }

    const [approved, rejected] = await Promise.all([
      query
        .clone()
        .andWhere('approval.action = :action', {
          action: ApprovalAction.APPROVED,
        })
        .getCount(),
      query
        .clone()
        .andWhere('approval.action = :action', {
          action: ApprovalAction.REJECTED,
        })
        .getCount(),
    ]);

    return {
      total: approved + rejected,
      approved,
      rejected,
    };
  }
}