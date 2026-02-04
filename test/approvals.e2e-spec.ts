import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ApprovalsController (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let approverToken: string;
  let adminToken: string;
  let userId: string;
  let approverId: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register users
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'doc-user@example.com',
        password: 'password123',
        name: 'Document User',
      });
    userToken = userRes.body.access_token;
    userId = userRes.body.user.id;

    const approverRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'doc-approver@example.com',
        password: 'password123',
        name: 'Document Approver',
        role: 'approver',
      });
    approverToken = approverRes.body.access_token;
    approverId = approverRes.body.user.id;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'doc-admin@example.com',
        password: 'password123',
        name: 'Document Admin',
        role: 'admin',
      });
    adminToken = adminRes.body.access_token;

    // Create and submit a document
    const docRes = await request(app.getHttpServer())
      .post('/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Document for Approval',
        content: 'This document needs approval',
      });
    documentId = docRes.body.id;

    // Submit for approval
    await request(app.getHttpServer())
      .post(`/documents/${documentId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/approvals/documents/:documentId (POST)', () => {
    it('should approve document as approver', () => {
      return request(app.getHttpServer())
        .post(`/approvals/documents/${documentId}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approved',
          comment: 'Looks good!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('action', 'approved');
          expect(res.body).toHaveProperty('comment', 'Looks good!');
          expect(res.body).toHaveProperty('documentId', documentId);
          expect(res.body).toHaveProperty('approverId', approverId);
        });
    });

    it('should not approve as regular user', async () => {
      // Create new document
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Another Document',
          content: 'This is another document for testing',
        });

      await request(app.getHttpServer())
        .post(`/documents/${newDoc.body.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      return request(app.getHttpServer())
        .post(`/approvals/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'approved',
        })
        .expect(403);
    });

    it('should reject document with comment', async () => {
      // Create new document
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Document to Reject',
          content: 'This document will be rejected',
        });

      await request(app.getHttpServer())
        .post(`/documents/${newDoc.body.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      return request(app.getHttpServer())
        .post(`/approvals/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'rejected',
          comment: 'Needs more information',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('action', 'rejected');
          expect(res.body).toHaveProperty('comment', 'Needs more information');
        });
    });

    it('should not approve own document', async () => {
      // Create document as approver
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          title: 'Approver Document',
          content: 'Document created by approver',
        });

      await request(app.getHttpServer())
        .post(`/documents/${newDoc.body.id}/submit`)
        .set('Authorization', `Bearer ${approverToken}`);

      return request(app.getHttpServer())
        .post(`/approvals/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approved',
        })
        .expect(400);
    });

    it('should not approve document twice', () => {
      return request(app.getHttpServer())
        .post(`/approvals/documents/${documentId}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approved',
        })
        .expect(400);
    });

    it('should not approve non-pending document', async () => {
      // Create draft document
      const draftDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Draft Document',
          content: 'This is still a draft',
        });

      return request(app.getHttpServer())
        .post(`/approvals/documents/${draftDoc.body.id}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approved',
        })
        .expect(400);
    });
  });

  describe('/approvals (GET)', () => {
    it('should get all approvals', () => {
      return request(app.getHttpServer())
        .get('/approvals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should filter approvals by document', () => {
      return request(app.getHttpServer())
        .get(`/approvals?documentId=${documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((approval) => {
            expect(approval.documentId).toBe(documentId);
          });
        });
    });

    it('should filter approvals by approver', () => {
      return request(app.getHttpServer())
        .get(`/approvals?approverId=${approverId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((approval) => {
            expect(approval.approverId).toBe(approverId);
          });
        });
    });

    it('should filter approvals by action', () => {
      return request(app.getHttpServer())
        .get('/approvals?action=approved')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((approval) => {
            expect(approval.action).toBe('approved');
          });
        });
    });
  });

  describe('/approvals/my-approvals (GET)', () => {
    it('should get my approvals as approver', () => {
      return request(app.getHttpServer())
        .get('/approvals/my-approvals')
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should not access as regular user', () => {
      return request(app.getHttpServer())
        .get('/approvals/my-approvals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/approvals/stats (GET)', () => {
    it('should get my approval stats', () => {
      return request(app.getHttpServer())
        .get('/approvals/stats')
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('approved');
          expect(res.body).toHaveProperty('rejected');
        });
    });
  });

  describe('/approvals/stats/all (GET)', () => {
    it('should get all approval stats as admin', () => {
      return request(app.getHttpServer())
        .get('/approvals/stats/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('approved');
          expect(res.body).toHaveProperty('rejected');
        });
    });

    it('should not access as regular user', () => {
      return request(app.getHttpServer())
        .get('/approvals/stats/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('/approvals/documents/:documentId (GET)', () => {
    it('should get approvals for specific document', () => {
      return request(app.getHttpServer())
        .get(`/approvals/documents/${documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Document status after approval', () => {
    it('should update document status to APPROVED', async () => {
      const doc = await request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(doc.body.status).toBe('approved');
    });

    it('should update document status to REJECTED', async () => {
      // Create and reject a document
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Reject Status',
          content: 'Testing reject status update',
        });

      await request(app.getHttpServer())
        .post(`/documents/${newDoc.body.id}/submit`)
        .set('Authorization', `Bearer ${userToken}`);

      await request(app.getHttpServer())
        .post(`/approvals/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'rejected',
          comment: 'Testing',
        });

      const doc = await request(app.getHttpServer())
        .get(`/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(doc.body.status).toBe('rejected');
    });
  });
});