import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('DocumentsController (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let approverToken: string;
  let adminToken: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register and login as regular user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User',
      });
    userToken = userRes.body.access_token;

    // Register and login as approver
    const approverRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'approver@example.com',
        password: 'password123',
        name: 'Approver User',
        role: 'approver',
      });
    approverToken = approverRes.body.access_token;

    // Register and login as admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
      });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/documents (POST)', () => {
    it('should create a document', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Document',
          content: 'This is test content for the document',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('title', 'Test Document');
          expect(res.body).toHaveProperty('status', 'draft');
          documentId = res.body.id;
        });
    });

    it('should not create document without auth', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .send({
          title: 'Test Document',
          content: 'This is test content',
        })
        .expect(401);
    });

    it('should validate title length', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'AB',
          content: 'This is test content for the document',
        })
        .expect(400);
    });

    it('should validate content length', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Document',
          content: 'Short',
        })
        .expect(400);
    });
  });

  describe('/documents (GET)', () => {
    it('should get all documents', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should filter documents by status', () => {
      return request(app.getHttpServer())
        .get('/documents?status=draft')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((doc) => {
            expect(doc.status).toBe('draft');
          });
        });
    });
  });

  describe('/documents/my-documents (GET)', () => {
    it('should get my documents only', () => {
      return request(app.getHttpServer())
        .get('/documents/my-documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/documents/:id (GET)', () => {
    it('should get document by id', () => {
      return request(app.getHttpServer())
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', documentId);
          expect(res.body).toHaveProperty('title', 'Test Document');
        });
    });

    it('should return 404 for non-existent document', () => {
      return request(app.getHttpServer())
        .get('/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('/documents/:id (PATCH)', () => {
    it('should update own document', () => {
      return request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Updated Document',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('title', 'Updated Document');
        });
    });

    it('should not update other user document', async () => {
      return request(app.getHttpServer())
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          title: 'Hacked Document',
        })
        .expect(403);
    });
  });

  describe('/documents/:id/submit (POST)', () => {
    it('should submit document for approval', () => {
      return request(app.getHttpServer())
        .post(`/documents/${documentId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'pending');
        });
    });

    it('should not submit already pending document', () => {
      return request(app.getHttpServer())
        .post(`/documents/${documentId}/submit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
    });

    it('should not submit other user document', async () => {
      // Create new document first
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Another Document',
          content: 'This is another test document',
        });

      return request(app.getHttpServer())
        .post(`/documents/${newDoc.body.id}/submit`)
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(403);
    });
  });

  describe('/documents/:id (DELETE)', () => {
    it('should not delete approved document as regular user', async () => {
      // This will be tested in phase 4 after approval workflow
    });

    it('should delete own draft document', async () => {
      // Create new document
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Document to Delete',
          content: 'This document will be deleted',
        });

      return request(app.getHttpServer())
        .delete(`/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should not delete other user document', async () => {
      // Create new document
      const newDoc = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Protected Document',
          content: 'This document is protected',
        });

      return request(app.getHttpServer())
        .delete(`/documents/${newDoc.body.id}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(403);
    });
  });
});