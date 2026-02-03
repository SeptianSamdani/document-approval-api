import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { DocumentStatus } from '../../common/enums/document-status.enum';
import { User } from '../../users/entities/user.entity';
import { Approval } from '../../approvals/entities/approval.entity'; 

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, (user) => user.documents)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => Approval, (approval) => approval.document)
  approvals: Approval[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}