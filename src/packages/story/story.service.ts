import { Injectable, Logger } from '@nestjs/common';
import { StoryRepository } from './story.repository';
import { JobStatusResponseDto } from 'src/core/upload/dto/background-job.dto';
import { JOB_TYPES, UPLOAD_CONSTANTS } from 'src/core/upload/constants/upload.constants';
import bull from 'bull';
import { CacheService } from 'src/core/cache/cache.service';
import { CloudinaryService } from 'src/core/upload/services/cloudinary.service';
import { UploadAssetService } from 'src/core/upload/services/upload-asset.service';
import { BackgroundJobRepository } from 'src/core/upload/repositories/background-job.repository';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { writeTempFile } from 'src/core/upload/helpers/temp-file';

@Injectable()
export class StoryService {
    private readonly logger = new Logger(StoryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly uploadAssetService: UploadAssetService,
        private readonly backgroundJobRepository: BackgroundJobRepository,
        private readonly cacheService: CacheService,
        private repo: StoryRepository,
        @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME) private readonly uploadQueue: bull.Queue,
    ) { }

    async getHomeStories(userId: number) {
        const stories = await this.repo.getHomeStories(userId);

        const mapped = stories.map(s => {
            const isViewed = s.StoryView.length > 0;
            const isLiked = s.StoryLike.length > 0;

            return {
                id: s.id,
                createdAt: s.createdAt,
                user: s.User,
                isViewed,
                isLiked
            };
        });

        return mapped.sort((a, b) => {
            const aSeen = a.isViewed || a.isLiked;
            const bSeen = b.isViewed || b.isLiked;

            if (aSeen !== bSeen) {
                return aSeen ? 1 : -1; // unseen lên đầu
            }

            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }

    async viewStory(userId: number, storyId: number) {
        await this.repo.upsertView(userId, storyId);
    }

    async likeStory(userId: number, storyId: number) {
        const liked = await this.repo.toggleLike(userId, storyId);
        return { liked };
    }

    async createStoryBackground(
        file: Express.Multer.File,
        userId: number,
    ): Promise<JobStatusResponseDto> {
        this.logger.log(`createStoryBackground userId=${userId}`);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) throw new Error('User not found');

        // Tạo story record
        const story = await this.prisma.story.create({
            data: {
                userId,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 giờ sau
                mediaUrl: '',
            },
        });

        // Tạo background job
        const job = await this.backgroundJobRepository.create({
            type: 'story',
            fileName: file.originalname,
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: 3,
            createdDate: new Date(),
        });

        const isVideo = file.mimetype.startsWith('video/');
        const filePath = writeTempFile(file.buffer, file.originalname);

        await this.uploadQueue.add(
            isVideo ? JOB_TYPES.UPLOAD_STORY_VIDEO : JOB_TYPES.UPLOAD_STORY_IMAGE,
            {
                jobId: job.id,
                filePath,
                fileName: file.originalname,
                type: isVideo ? 'video' : 'image',
                storyId: story.id,
                userId,
            },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
            },
        );

        return {
            jobId: story.id.toString(),
            message: 'Story creation scheduled',
            status: 'pending',
        };
    }
}
