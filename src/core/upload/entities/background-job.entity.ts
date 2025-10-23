import { IFullAudited } from '../../commons/interfaces/audited.interface';

export class BackgroundJobEntity implements IFullAudited {
  id: string;
  type: 'image' | 'video';
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  progress: number;
  retryCount: number;
  maxRetries: number;
  publicId?: string;
  url?: string;
  secureUrl?: string;
  fileSize?: number;
  format?: string;
  completedAt?: Date;

  // Audit fields
  createdDate: Date;
  createdBy?: string | null;
  modifiedDate: Date;
  modifiedBy?: string | null;
  deleted: boolean;
  deletedDate?: Date | null;
  deletedBy?: string | null;
}