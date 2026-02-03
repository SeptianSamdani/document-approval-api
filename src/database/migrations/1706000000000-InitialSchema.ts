import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1706000000000 implements MigrationInterface {
  name = 'InitialSchema1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('admin', 'approver', 'user')
    `);
    
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "name" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create documents table
    await queryRunner.query(`
      CREATE TYPE "document_status_enum" AS ENUM('draft', 'pending', 'approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "content" text NOT NULL,
        "status" "document_status_enum" NOT NULL DEFAULT 'draft',
        "creator_id" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
      )
    `);

    // Create approvals table
    await queryRunner.query(`
      CREATE TYPE "approval_action_enum" AS ENUM('approved', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "approvals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "document_id" uuid NOT NULL,
        "approver_id" uuid NOT NULL,
        "action" "approval_action_enum" NOT NULL,
        "comment" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approvals_id" PRIMARY KEY ("id")
      )
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD CONSTRAINT "FK_documents_creator" 
      FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "approvals" 
      ADD CONSTRAINT "FK_approvals_document" 
      FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "approvals" 
      ADD CONSTRAINT "FK_approvals_approver" 
      FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "approvals" DROP CONSTRAINT "FK_approvals_approver"`);
    await queryRunner.query(`ALTER TABLE "approvals" DROP CONSTRAINT "FK_approvals_document"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_creator"`);
    
    await queryRunner.query(`DROP TABLE "approvals"`);
    await queryRunner.query(`DROP TYPE "approval_action_enum"`);
    
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "document_status_enum"`);
    
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}