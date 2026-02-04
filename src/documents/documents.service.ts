import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { DocumentStatus } from '../common/enums/document-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = this.documentsRepository.create({
      ...createDocumentDto,
      creatorId: userId,
      status: DocumentStatus.DRAFT,
    });

    return this.documentsRepository.save(document);
  }

  async findAll(filterDto?: FilterDocumentDto): Promise<Document[]> {
    const query = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.creator', 'creator')
      .select([
        'document',
        'creator.id',
        'creator.name',
        'creator.email',
        'creator.role',
      ]);

    if (filterDto?.status) {
      query.andWhere('document.status = :status', { status: filterDto.status });
    }

    if (filterDto?.creatorId) {
      query.andWhere('document.creatorId = :creatorId', {
        creatorId: filterDto.creatorId,
      });
    }

    return query.orderBy('document.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['creator', 'approvals', 'approvals.approver'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async findMyDocuments(userId: string): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { creatorId: userId },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Document> {
    const document = await this.findOne(id);

    // Check ownership
    if (document.creatorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own documents');
    }

    // Check if document can be edited
    if (
      document.status === DocumentStatus.PENDING &&
      userRole !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Cannot update document while in PENDING status',
      );
    }

    if (
      document.status === DocumentStatus.APPROVED &&
      userRole !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot update approved document');
    }

    Object.assign(document, updateDocumentDto);
    return this.documentsRepository.save(document);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const document = await this.findOne(id);

    // Check ownership
    if (document.creatorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    // Check if document can be deleted
    if (
      document.status === DocumentStatus.APPROVED &&
      userRole !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Cannot delete approved document');
    }

    await this.documentsRepository.remove(document);
  }

  async submitForApproval(
    id: string,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(id);

    // Check ownership
    if (document.creatorId !== userId) {
      throw new ForbiddenException(
        'You can only submit your own documents for approval',
      );
    }

    // Check current status
    if (document.status !== DocumentStatus.DRAFT && document.status !== DocumentStatus.REJECTED) {
      throw new BadRequestException(
        'Only DRAFT or REJECTED documents can be submitted for approval',
      );
    }

    document.status = DocumentStatus.PENDING;
    return this.documentsRepository.save(document);
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
  ): Promise<Document> {
    const document = await this.findOne(id);
    document.status = status;
    return this.documentsRepository.save(document);
  }
}