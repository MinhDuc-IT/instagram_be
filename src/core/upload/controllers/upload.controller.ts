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
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiResponse,
} from '@nestjs/swagger';
import { CloudinaryService } from '../services/cloudinary.service';
import { BackgroundJobRepository } from '../repositories/background-job.repository';
import { UploadAssetService } from '../services/upload-asset.service';
import { FileValidationPipe } from '../pipes/file-validation.pipe';
import { UploadLoggingInterceptor } from '../interceptors/upload-logging.interceptor';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { BackgroundJobDto, JobStatusResponseDto } from '../dto/background-job.dto';
import { UPLOAD_CONSTANTS, JOB_TYPES } from '../constants/upload.constants';
import { Public } from 'src/core/decorators/response.decorator';
import path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { deleteTempFile, writeTempFile } from '../helpers/temp-file';

@ApiTags('Upload')
@Controller('api/upload')
@UseInterceptors(UploadLoggingInterceptor)
@Public()
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(
        private readonly cloudinaryService: CloudinaryService,
        private readonly backgroundJobRepository: BackgroundJobRepository,
        private readonly uploadAssetService: UploadAssetService,
        @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME) private uploadQueue: Queue,
    ) { }

    @Post('image')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './tmp/uploads', // hoặc os.tmpdir()
                filename: (req, file, cb) => {
                    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = file.originalname.split('.').pop();
                    cb(null, `${unique}.${ext}`);
                },
            }),
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload image file',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload an image with filePath (fast)' })
    async uploadImage(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: UPLOAD_CONSTANTS.MAX_IMAGE_SIZE,
                allowedTypes: UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES,
                fileType: 'image',
            }),
        )
        file: Express.Multer.File,
    ): Promise<UploadResponseDto | null> {
        this.logger.log(`Uploading image: ${file.originalname}`);

        const result = await this.cloudinaryService.uploadImage(
            file.path,
            file.originalname,
        );

        const response = await this.uploadAssetService.saveAsset(
            result,
            'image',
            file.originalname,
            UPLOAD_CONSTANTS.IMAGE_FOLDER,
            null
        );

        deleteTempFile(file.path);
        return response;
    }


    @Post('video')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './tmp/uploads',
                filename: (req, file, cb) => {
                    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = file.originalname.split('.').pop();
                    cb(null, `${unique}.${ext}`);
                },
            }),
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload video file',
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a video (fast optimized)' })
    async uploadVideo(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: UPLOAD_CONSTANTS.MAX_VIDEO_SIZE,
                allowedTypes: UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES,
                fileType: 'video',
            }),
        )
        file: Express.Multer.File,
    ): Promise<UploadResponseDto | null> {
        this.logger.log(`Uploading video: ${file.originalname}`);

        const result = await this.cloudinaryService.uploadVideo(
            file.path,
            file.originalname,
        );

        const response = await this.uploadAssetService.saveAsset(
            result,
            'video',
            file.originalname,
            UPLOAD_CONSTANTS.VIDEO_FOLDER,
            null,
        );

        deleteTempFile(file.path);
        return response;
    }

    @Post('image/background')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload image file in background',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload an image in background (async)' })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: 'Image upload scheduled',
        type: JobStatusResponseDto,
    })
    async uploadImageBackground(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: UPLOAD_CONSTANTS.MAX_IMAGE_SIZE,
                allowedTypes: UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES,
                fileType: 'image',
            }),
        )
        file: Express.Multer.File,
    ): Promise<JobStatusResponseDto> {
        // Create job record
        const job = await this.backgroundJobRepository.create({
            type: 'image',
            fileName: file.originalname,
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: 3,
            createdDate: new Date(),
        });

        const filePath = writeTempFile(file.buffer, file.originalname);
        console.log('Temporary file created at:', filePath);

        try {
            // Add to queue (fire and forget)
            await this.uploadQueue.add(
                JOB_TYPES.UPLOAD_IMAGE,
                {
                    jobId: job.id,
                    // fileBase64: file.buffer.toString('base64'),
                    filePath: filePath,
                    fileName: file.originalname,
                    type: 'image',
                },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            );
        } finally {
            // deleteTempFile(filePath);
        }

        this.logger.log(`Background image upload scheduled: ${job.id}`);

        return {
            jobId: job.id,
            message: 'Image upload scheduled in background',
            status: 'pending',
        };
    }

    @Post('video/background')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Upload video file in background',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a video in background (async)' })
    @ApiResponse({
        status: HttpStatus.ACCEPTED,
        description: 'Video upload scheduled',
        type: JobStatusResponseDto,
    })
    async uploadVideoBackground(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: UPLOAD_CONSTANTS.MAX_VIDEO_SIZE,
                allowedTypes: UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES,
                fileType: 'video',
            }),
        )
        file: Express.Multer.File,
    ): Promise<JobStatusResponseDto> {
        // Create job record
        const job = await this.backgroundJobRepository.create({
            type: 'video',
            fileName: file.originalname,
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: 3,
            createdDate: new Date(),
        });

        const filePath = writeTempFile(file.buffer, file.originalname);
        console.log('Temporary file created at:', filePath);

        try {
            // Add to queue (fire and forget)
            await this.uploadQueue.add(
                JOB_TYPES.UPLOAD_VIDEO,
                {
                    jobId: job.id,
                    // fileBase64: file.buffer.toString('base64'),
                    filePath: filePath,
                    fileName: file.originalname,
                    type: 'video',
                },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                },
            );
        } finally {
            // deleteTempFile(filePath);
        }

        this.logger.log(`Background video upload scheduled: ${job.id}`);

        return {
            jobId: job.id,
            message: 'Video upload scheduled in background',
            status: 'pending',
        };
    }

    @Get('job/:jobId')
    @ApiOperation({ summary: 'Get job status by ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Job status retrieved',
        type: BackgroundJobDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Job not found',
    })
    async getJobStatus(@Param('jobId') jobId: string): Promise<BackgroundJobDto> {
        const job = await this.backgroundJobRepository.findById(jobId);

        if (!job) {
            throw new BadRequestException('Job not found');
        }

        return job;
    }

    @Get('jobs')
    @ApiOperation({ summary: 'Get all jobs' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Jobs retrieved',
        type: [BackgroundJobDto],
    })
    async getAllJobs(): Promise<BackgroundJobDto[]> {
        return this.backgroundJobRepository.findAll();
    }

    @Get('jobs/status/:status')
    @ApiOperation({ summary: 'Get jobs by status' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Jobs retrieved',
        type: [BackgroundJobDto],
    })
    async getJobsByStatus(
        @Param('status') status: 'pending' | 'processing' | 'completed' | 'failed',
    ): Promise<BackgroundJobDto[]> {
        return this.backgroundJobRepository.findByStatus(status);
    }

    @Delete('job/:jobId')
    @ApiOperation({ summary: 'Delete a job' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Job deleted successfully',
    })
    async deleteJob(@Param('jobId') jobId: string) {
        const success = await this.backgroundJobRepository.delete(jobId);
        return { success };
    }

    @Get('health')
    @ApiOperation({ summary: 'Health check for upload service' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Service health status',
    })
    async healthCheck() {
        const pendingJobs = await this.backgroundJobRepository.findPending();
        const stats = await this.uploadAssetService.getStats();

        return {
            status: 'ok',
            timestamp: new Date(),
            queue: {
                pending: pendingJobs.length,
            },
            storage: stats,
        };
    }
}