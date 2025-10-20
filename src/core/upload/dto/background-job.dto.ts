import { UploadResponseDto } from "./upload-response.dto";

export class BackgroundJobDto {
    id: string;
    type: 'image' | 'video';
    fileName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: UploadResponseDto;
    error?: string;
    progress?: number;
    createdAt: Date;
    completedAt?: Date;
    retryCount?: number;
    maxRetries?: number;
}