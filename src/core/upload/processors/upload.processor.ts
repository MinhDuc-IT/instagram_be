import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import type { Job } from 'bull';
import { CloudinaryService } from '../services/cloudinary.service';
import { BackgroundJobRepository } from '../repositories/background-job.repository';
import { UploadAssetService } from '../services/upload-asset.service';
import { UPLOAD_CONSTANTS, JOB_TYPES } from '../constants/upload.constants';
import { deleteTempFile } from '../helpers/temp-file';

interface UploadJobData {
    jobId: string;
    fileBase64: string;
    filePath: string;
    fileName: string;
    postId: string | null;
    type: 'image' | 'video';
}

@Processor(UPLOAD_CONSTANTS.QUEUE_NAME)
export class UploadProcessor {
    private readonly logger = new Logger(UploadProcessor.name);

    constructor(
        private cloudinaryService: CloudinaryService,
        private backgroundJobRepository: BackgroundJobRepository,
        private uploadAssetService: UploadAssetService,
    ) { }

    @Process('cleanupOldJobs')
    async handleCleanupOldJobs(job: Job) {
        this.logger.log('Processing cleanupOldJobs...');
        const count = await this.backgroundJobRepository.deleteOldJobs(
            UPLOAD_CONSTANTS.MAX_JOB_RETENTION_HOURS,
        );

        if (count > 0) {
            this.logger.log(`Cleaned up ${count} old jobs`);
        } else {
            this.logger.log('No old jobs to clean up.');
        }

        return { cleaned: count };
    }

    @Process(JOB_TYPES.UPLOAD_IMAGE)
    async handleImageUpload(job: Job<UploadJobData>) {
        const { jobId, fileBase64, fileName, postId, filePath} = job.data;

        try {
            this.logger.log(`Processing image upload job: ${jobId}`);

            await this.backgroundJobRepository.updateStatus(jobId, 'processing', 10);
            await job.progress(10);

            // const fileBuffer = Buffer.from(fileBase64, 'base64');
            // const result = await this.cloudinaryService.uploadImage(fileBuffer, fileName);
            // const buffer = fs.readFileSync(filePath);
            const result = await this.cloudinaryService.uploadImage(filePath, fileName);
            fs.unlinkSync(filePath);

            await job.progress(70);
            await this.backgroundJobRepository.updateStatus(jobId, 'processing', 70);

            if(postId != null){
                await this.uploadAssetService.saveAsset(
                    result,
                    'image',
                    fileName,
                    UPLOAD_CONSTANTS.IMAGE_FOLDER,
                    postId,
                );
            }

            await job.progress(100);
            await this.backgroundJobRepository.updateResult(jobId, result);

            this.logger.log(`Image upload job completed: ${jobId}`);
            return result;
        } catch (error) {
            this.logger.error(`Image upload job failed: ${jobId}`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.backgroundJobRepository.updateError(jobId, errorMessage, true);
            throw error;
        } finally {
            deleteTempFile(filePath);
        }
    }

    @Process(JOB_TYPES.UPLOAD_VIDEO)
    async handleVideoUpload(job: Job<UploadJobData>) {
        const { jobId, fileBase64, fileName, postId, filePath } = job.data;

        try {
            this.logger.log(`Processing video upload job: ${jobId}`);

            await this.backgroundJobRepository.updateStatus(jobId, 'processing', 10);
            await job.progress(10);

            // const fileBuffer = Buffer.from(fileBase64, 'base64');
            // const result = await this.cloudinaryService.uploadVideo(fileBuffer, fileName);
            // const buffer = fs.readFileSync(filePath);
            const result = await this.cloudinaryService.uploadVideo(filePath, fileName);
            fs.unlinkSync(filePath);

            await job.progress(70);
            await this.backgroundJobRepository.updateStatus(jobId, 'processing', 70);

            if (postId != null) {
                await this.uploadAssetService.saveAsset(
                    result,
                    'video',
                    fileName,
                    UPLOAD_CONSTANTS.VIDEO_FOLDER,
                    postId,
                );
            }

            await job.progress(100);
            await this.backgroundJobRepository.updateResult(jobId, result);

            this.logger.log(`Video upload job completed: ${jobId}`);
            return result;
        } catch (error) {
            this.logger.error(`Video upload job failed: ${jobId}`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.backgroundJobRepository.updateError(jobId, errorMessage, true);
            throw error;
        } finally {
            deleteTempFile(filePath);
        }
    }
}