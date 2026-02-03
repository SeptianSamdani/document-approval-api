import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Document Approval Workflow API - v1.0.0';
  }
}