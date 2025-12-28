import { Injectable, Logger } from '@nestjs/common';
import { StoryRepository } from './story.repository';
import { JobStatusResponseDto } from 'src/core/upload/dto/background-job.dto';
import { JOB_TYPES, UPLOAD_CONSTANTS } from 'src/core/upload/constants/upload.constants';
import bull from 'bull';
import { BackgroundJobRepository } from 'src/core/upload/repositories/background-job.repository';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { writeTempFile } from 'src/core/upload/helpers/temp-file';
import { buildPaginatedResponse } from 'src/utils/buildPaginatedResponse';

@Injectable()
export class StoryService {
    private readonly logger = new Logger(StoryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly backgroundJobRepository: BackgroundJobRepository,
        private repo: StoryRepository,
        @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME) private readonly uploadQueue: bull.Queue,
    ) { }

    async getHomeStories(
        userId: number,
        page: number,
        limit: number,
    ) {
        // Fetch all candidates (users with stories)
        // Note: For large scale, we should move sorting logic to DB/Repository, but for this project scope, in-memory sorting of active story posters is acceptable.
        const usersWithStories = await this.repo.getHomeStories(userId, page, limit);

        const mapped = usersWithStories.map(user => {
            const stories = user.Story.map(s => {
                const isViewed = s.StoryView.length > 0;
                const isLiked = s.StoryLike.length > 0;
                return {
                    id: s.id,
                    mediaUrl: s.mediaUrl,
                    type: (s as any).type,
                    createdAt: s.createdAt,
                    expiresAt: s.expiresAt,
                    isViewed,
                    isLiked,
                };
            });

            // Check if user has ANY unseen story
            const hasUnseen = stories.some(s => !s.isViewed);
            // Latest story time for sorting
            const latestStoryAt = stories[stories.length - 1]?.createdAt?.getTime() || 0;

            return {
                user: {
                    id: user.id,
                    userName: user.userName,
                    avatar: user.avatar,
                },
                stories,
                hasUnseen,
                latestStoryAt,
            };
        });

        // Sorting Logic:
        // 1. Current User (requests say "Hiển thị story của chính user đầu tiên")
        // 2. Users with Unseen stories (Recent first)
        // 3. Users with only Seen stories (Recent first)
        const sorted = mapped.sort((a, b) => {
            if (a.user.id === userId) return -1;
            if (b.user.id === userId) return 1;

            if (a.hasUnseen !== b.hasUnseen) {
                return a.hasUnseen ? -1 : 1; // Unseen first
            }

            return b.latestStoryAt - a.latestStoryAt; // Recent first
        });

        // Manual Pagination
        const totalCount = sorted.length;
        const startIndex = (page - 1) * limit;
        const sliced = sorted.slice(startIndex, startIndex + limit);

        return buildPaginatedResponse(
            sliced,
            totalCount,
            page,
            limit,
        );
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
