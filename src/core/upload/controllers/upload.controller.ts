import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpCode,
    HttpStatus,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../services/cloudinary.service';
import { BackgroundJobService } from '../services/background-job.service';
import { FileUploadGuard } from '../guards/file-upload.guard';
import { FileSizePipe } from '../pipes/file-size.pipe';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

@Controller('api/upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(
        private readonly cloudinaryService: CloudinaryService,
        private readonly backgroundJobService: BackgroundJobService,
    ) { }

    /**
     * POST /api/upload/image
     * Upload image directly
     */
    @Post('image')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @HttpCode(HttpStatus.CREATED)
    async uploadImage(
        @UploadedFile(
            new FileSizePipe(UPLOAD_CONSTANTS.MAX_IMAGE_SIZE),
        )
        file: Express.Multer.File,
    ): Promise<UploadResponseDto> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid image type');
        }

        this.logger.log(`Uploading image: ${file.originalname}`);
        return this.cloudinaryService.uploadImage(
            file.buffer,
            file.originalname,
        );
    }

    /**
     * POST /api/upload/video
     * Upload video directly
     */
    @Post('video')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @HttpCode(HttpStatus.CREATED)
    async uploadVideo(
        @UploadedFile(
            new FileSizePipe(UPLOAD_CONSTANTS.MAX_VIDEO_SIZE),
        )
        file: Express.Multer.File,
    ): Promise<UploadResponseDto> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid video type');
        }

        this.logger.log(`Uploading video: ${file.originalname}`);
        return this.cloudinaryService.uploadVideo(
            file.buffer,
            file.originalname,
        );
    }

    /**
     * POST /api/upload/image/background
     * Upload image in background
     */
    @Post('image/background')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @HttpCode(HttpStatus.ACCEPTED)
    async uploadImageBackground(
        @UploadedFile(
            new FileSizePipe(UPLOAD_CONSTANTS.MAX_IMAGE_SIZE),
        )
        file: Express.Multer.File,
    ): Promise<{ jobId: string; message: string }> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid image type');
        }

        const job = await this.backgroundJobService.createJob('image', file.originalname);

        this.logger.log(`Background image upload scheduled: ${job.id}`);

        await this.processImageUploadAsync(job.id, file.buffer, file.originalname);


        return {
            jobId: job.id,
            message: 'Image upload scheduled in background',
        };
    }

    /**
     * POST /api/upload/video/background
     * Upload video in background
     */
    @Post('video/background')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @HttpCode(HttpStatus.ACCEPTED)
    async uploadVideoBackground(
        @UploadedFile(
            new FileSizePipe(UPLOAD_CONSTANTS.MAX_VIDEO_SIZE),
        )
        file: Express.Multer.File,
    ): Promise<{ jobId: string; message: string }> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
            throw new BadRequestException('Invalid video type');
        }

        const job = await this.backgroundJobService.createJob('video', file.originalname);

        this.logger.log(`Background video upload scheduled: ${job.id}`);

        // Process in background
        await this.processVideoUploadAsync(job.id, file.buffer, file.originalname);

        return {
            jobId: job.id,
            message: 'Video upload scheduled in background',
        };
    }

    /**
     * GET /api/upload/job/:jobId
     * Get job status
     */
    @Get('job/:jobId')
    getJobStatus(@Param('jobId') jobId: string) {
        const job = this.backgroundJobService.getJob(jobId);
        if (!job) {
            throw new BadRequestException('Job not found');
        }
        return job;
    }

    /**
     * GET /api/upload/jobs
     * Get all jobs
     */
    @Get('jobs')
    getAllJobs() {
        return this.backgroundJobService.getAllJobs();
    }

    /**
     * GET /api/upload/jobs/status/:status
     * Get jobs by status
     */
    @Get('jobs/status/:status')
    getJobsByStatus(
        @Param('status') status: 'pending' | 'processing' | 'completed' | 'failed',
    ) {
        return this.backgroundJobService.getJobsByStatus(status);
    }

    /**
     * DELETE /api/upload/:publicId
     * Delete asset
     */
    @Delete(':publicId')
    async deleteAsset(@Param('publicId') publicId: string) {
        const success = await this.cloudinaryService.deleteAsset(publicId);
        return { success };
    }

    /**
     * DELETE /api/upload/job/:jobId
     * Delete job
     */
    @Delete('job/:jobId')
    deleteJob(@Param('jobId') jobId: string) {
        const success = this.backgroundJobService.deleteJob(jobId);
        return { success };
    }

    // Private methods
    private async processImageUploadAsync(
        jobId: string,
        fileBuffer: Buffer,
        fileName: string,
    ): Promise<void> {
        try {
            this.backgroundJobService.updateJobStatus(jobId, 'processing', 50);

            const result = await this.cloudinaryService.uploadImage(
                fileBuffer,
                fileName,
            );

            this.backgroundJobService.updateJobResult(jobId, result);
            this.logger.log(`Background job ${jobId} completed`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.backgroundJobService.updateJobError(jobId, errorMessage, true);
            this.logger.error(`Background job ${jobId} failed:`, error);
        }
    }

    private async processVideoUploadAsync(
        jobId: string,
        fileBuffer: Buffer,
        fileName: string,
    ): Promise<void> {
        try {
            this.backgroundJobService.updateJobStatus(jobId, 'processing', 50);

            const result = await this.cloudinaryService.uploadVideo(
                fileBuffer,
                fileName,
            );

            this.backgroundJobService.updateJobResult(jobId, result);
            this.logger.log(`Background job ${jobId} completed`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.backgroundJobService.updateJobError(jobId, errorMessage, true);
            this.logger.error(`Background job ${jobId} failed:`, error);
        }
    }
}