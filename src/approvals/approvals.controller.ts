import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { FilterApprovalDto } from './dto/filter-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('documents/:documentId')
  @Roles(UserRole.APPROVER, UserRole.ADMIN)
  create(
    @Param('documentId') documentId: string,
    @Body() createApprovalDto: CreateApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.create(
      documentId,
      createApprovalDto,
      user.id,
      user.role,
    );
  }

  @Get()
  findAll(@Query() filterDto: FilterApprovalDto) {
    return this.approvalsService.findAll(filterDto);
  }

  @Get('my-approvals')
  @Roles(UserRole.APPROVER, UserRole.ADMIN)
  findMyApprovals(@CurrentUser() user: any) {
    return this.approvalsService.findMyApprovals(user.id);
  }

  @Get('stats')
  @Roles(UserRole.APPROVER, UserRole.ADMIN)
  getMyStats(@CurrentUser() user: any) {
    return this.approvalsService.getApprovalStats(user.id);
  }

  @Get('stats/all')
  @Roles(UserRole.ADMIN)
  getAllStats() {
    return this.approvalsService.getApprovalStats();
  }

  @Get('documents/:documentId')
  findByDocument(@Param('documentId') documentId: string) {
    return this.approvalsService.findByDocument(documentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }
}