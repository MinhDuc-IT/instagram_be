import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CloudinaryService } from '../../core/upload/services/cloudinary.service';
import { UploadAssetService } from '../../core/upload/services/upload-asset.service';
import { CreatePostDto } from './dto/create-post.dto';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JOB_TYPES, UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { BackgroundJobRepository } from '../../core/upload/repositories/background-job.repository';

@Injectable()
export class PostService {
    private readonly logger = new Logger(PostService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly uploadAssetService: UploadAssetService,
        private readonly backgroundJobRepository: BackgroundJobRepository,
        @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME) private readonly uploadQueue: Queue,
    ) { }

    async createPost(dto: CreatePostDto, files: Express.Multer.File[], userId: number) {
        this.logger.log(`Creating post for user ${userId}`);

        this.logger.debug(`CreatePostDto: ${JSON.stringify(dto)}`);

        const isLikesHidden = String(dto.isLikesHidden) === 'true';
        const isCommentsDisabled = String(dto.isCommentsDisabled) === 'true';

        const post = await this.prisma.post.create({
            data: {
                userId,
                caption: dto.caption,
                location: dto.location,
                visibility: dto.visibility ?? 'public',
                isLikesHidden,
                isCommentsDisabled,
            },
        });

        for (const file of files) {
            const isVideo = file.mimetype.startsWith('video/');
            const result = isVideo
                ? await this.cloudinaryService.uploadVideo(file.buffer, file.originalname)
                : await this.cloudinaryService.uploadImage(file.buffer, file.originalname);

            await this.uploadAssetService.saveAsset(
                result,
                isVideo ? 'video' : 'image',
                file.originalname,
                isVideo ? UPLOAD_CONSTANTS.VIDEO_FOLDER : UPLOAD_CONSTANTS.IMAGE_FOLDER,
                post.id,
            );
        }

        return await this.prisma.post.findUnique({
            where: { id: post.id },
            include: { media: true },
        });
    }

    async createPostBackground(dto: CreatePostDto, files: Express.Multer.File[], userId: number) {

        const isLikesHidden = String(dto.isLikesHidden) === 'true';
        const isCommentsDisabled = String(dto.isCommentsDisabled) === 'true';

        const post = await this.prisma.post.create({
            data: {
                userId,
                caption: dto.caption,
                location: dto.location,
                visibility: dto.visibility ?? 'public',
                isLikesHidden,
                isCommentsDisabled,
            },
        });

        for (const file of files) {
            // Create job record
            const job = await this.backgroundJobRepository.create({
                type: 'mixed',
                fileName: file.originalname,
                status: 'pending',
                progress: 0,
                retryCount: 0,
                maxRetries: 3,
                createdDate: new Date(),
            });

            const isVideo = file.mimetype.startsWith('video/');
            await this.uploadQueue.add(
                isVideo ? JOB_TYPES.UPLOAD_VIDEO : JOB_TYPES.UPLOAD_IMAGE,
                {
                    jobId: job.id,
                    fileBase64: file.buffer.toString('base64'),
                    fileName: file.originalname,
                    type: isVideo ? 'video' : 'image',
                    postId: post.id,
                    userId,
                },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                },
            );
        }

        this.logger.log(`Background upload scheduled for post ${post.id}`);

        return {
            jobId: post.id,
            message: 'Post creation scheduled in background',
            status: 'pending',
        };
    }

    async getPostById(id: string) {
        return this.prisma.post.findUnique({
            where: { id },
            include: { media: true, user: true },
        });
    }

    async getPosts(userId: number) {
        return this.prisma.post.findMany({
            where: { userId: Number(userId) },
            include: { media: true },
        });
    }
}
