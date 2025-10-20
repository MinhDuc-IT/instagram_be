import { Injectable, Logger } from '@nestjs/common';
import { BackgroundJobDto } from '../dto/background-job.dto';
import { BackgroundJobRepository } from '../repositories/background-job.repository';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

@Injectable()
export class BackgroundJobService {
    private readonly logger = new Logger(BackgroundJobService.name);

    constructor(private repository: BackgroundJobRepository) {
        this.startCleanupInterval();
    }

    async createJob(
        type: 'image' | 'video',
        fileName: string,
    ): Promise<BackgroundJobDto> {
        const job = await this.repository.create({
            type,
            fileName,
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(),
        });

        this.logger.log(`Job created: ${job.id}`);
        return job;
    }

    async getJob(jobId: string): Promise<BackgroundJobDto | null> {
        return this.repository.findById(jobId);
    }

    async getAllJobs(): Promise<BackgroundJobDto[]> {
        return this.repository.findAll();
    }

    async getJobsByStatus(status: string): Promise<BackgroundJobDto[]> {
        return this.repository.findByStatus(status);
    }

    async getPendingJobs(): Promise<BackgroundJobDto[]> {
        return this.repository.findPending();
    }

    async updateJobStatus(
        jobId: string,
        status: BackgroundJobDto['status'],
        progress?: number,
    ): Promise<BackgroundJobDto> {
        const job = await this.repository.updateStatus(jobId, status, progress);
        this.logger.log(`Job ${jobId} updated to ${status}`);
        return job;
    }

    async updateJobResult(jobId: string, result: any): Promise<BackgroundJobDto> {
        const job = await this.repository.updateResult(jobId, result);
        this.logger.log(`Job ${jobId} completed with result`);
        return job;
    }

    async updateJobError(
        jobId: string,
        error: string,
        retry: boolean = false,
    ): Promise<BackgroundJobDto> {
        const job = await this.repository.updateError(jobId, error, retry);

        if (job.status === 'pending') {
            this.logger.log(`Job ${jobId} scheduled for retry (${job.retryCount}/${job.maxRetries})`);
        } else {
            this.logger.error(`Job ${jobId} failed: ${error}`);
        }

        return job;
    }

    async deleteJob(jobId: string): Promise<boolean> {
        return this.repository.delete(jobId);
    }

    private startCleanupInterval(): void {
        setInterval(async () => {
            try {
                const count = await this.repository.deleteOldJobs(
                    UPLOAD_CONSTANTS.MAX_JOB_RETENTION_HOURS,
                );
                if (count > 0) {
                    this.logger.log(`Cleaned up ${count} old jobs`);
                }
            } catch (error) {
                this.logger.error('Error during job cleanup:', error);
            }
        }, UPLOAD_CONSTANTS.JOB_CLEANUP_INTERVAL);
    }
}