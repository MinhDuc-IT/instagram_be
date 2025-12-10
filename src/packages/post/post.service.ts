import { Injectable, Logger } from '@nestjs/common';
import path from 'path';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CloudinaryService } from '../../core/upload/services/cloudinary.service';
import { UploadAssetService } from '../../core/upload/services/upload-asset.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostDto } from './dto/get-post.dto';
import { CommentDto } from './dto/get-post.dto';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JOB_TYPES, UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { BackgroundJobRepository } from '../../core/upload/repositories/background-job.repository';
import { CacheService } from '../../core/cache/cache.service';
import { CacheKeyBuilder } from '../../core/cache/cache.config';

@Injectable()
export class PostService {
    private readonly logger = new Logger(PostService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly uploadAssetService: UploadAssetService,
        private readonly backgroundJobRepository: BackgroundJobRepository,
        private readonly cacheService: CacheService,
        @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME) private readonly uploadQueue: Queue,
    ) { }

    async createPost(dto: CreatePostDto, files: Express.Multer.File[], userId: number) {
        this.logger.log(`Creating post for user ${userId}`);

        this.logger.debug(`CreatePostDto: ${JSON.stringify(dto)}`);

        const isLikesHidden = String(dto.isLikesHidden) === 'true';
        const isCommentsDisabled = String(dto.isCommentsDisabled) === 'true';

        // Ensure user exists to avoid foreign key constraint violations
        const user = await this.prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) throw new Error('User not found');

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

        // Invalidate cache for this user's profile
        const cacheKey = CacheKeyBuilder.userProfile(userId);
        await this.cacheService.delete(cacheKey);

        return await this.prisma.post.findUnique({
            where: { id: post.id },
            include: { UploadedAsset: true },
        });
    }

    async createPostBackground(dto: CreatePostDto, files: Express.Multer.File[], userId: number) {
        this.logger.log(`createPostBackground called with userId=${userId}`);

        const isLikesHidden = String(dto.isLikesHidden) === 'true';
        const isCommentsDisabled = String(dto.isCommentsDisabled) === 'true';

        // Ensure user exists to avoid foreign key constraint violations
        const user = await this.prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) throw new Error('User not found');

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
            const ext = path.extname(file.originalname);
            const tmpFile = tmp.fileSync({ postfix: ext });
            fs.writeFileSync(tmpFile.name, file.buffer);
            console.log('Temporary file created at:', tmpFile.name);

            await this.uploadQueue.add(
              isVideo ? JOB_TYPES.UPLOAD_VIDEO : JOB_TYPES.UPLOAD_IMAGE,
              {
                jobId: job.id,
                // fileBase64: file.buffer.toString('base64'),
                filePath: tmpFile.name,
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

        // Invalidate cache for this user's profile
        const cacheKey = CacheKeyBuilder.userProfile(userId);
        await this.cacheService.delete(cacheKey);

        return {
            jobId: post.id,
            message: 'Post creation scheduled in background',
            status: 'pending',
        };
    }

    async getPostById(id: string, currentUserId?: number): Promise<PostDto | null> {
        const post = await this.prisma.post.findUnique({
            where: { id },
            include: { UploadedAsset: true, User: true },
        });

        if (!post) return null;

        // fetch counts and comment list
        const [likesCount, comments, existingLike, existingSave] = await Promise.all([
            this.prisma.postLike.count({ where: { postId: post.id } }),
            this.prisma.comment.findMany({
                where: { postId: post.id },
                orderBy: { createdAt: 'asc' },
                include: { User: true },
            }),
            currentUserId
                ? this.prisma.postLike.findUnique({ where: { actorId_postId: { actorId: Number(currentUserId), postId: post.id } } })
                : Promise.resolve(null),
            currentUserId
                ? this.prisma.postSave.findUnique({ where: { actorId_postId: { actorId: Number(currentUserId), postId: post.id } } })
                : Promise.resolve(null),
        ]);

        const mappedComments: CommentDto[] = comments.map(c => ({
            id: c.id,
            postId: c.postId,
            userId: c.userId,
            username: c.User?.userName || '',
            userAvatar: c.User?.avatar || '',
            content: c.content,
            replyTo: null,
            createdAt: c.createdAt?.toISOString() || '',
            updatedAt: c.updatedAt?.toISOString() || '',
        }));

        const dto: PostDto = {
            id: post.id,
            userId: post.userId,
            username: post.User?.userName || '',
            userAvatar: post.User?.avatar || '',
            caption: post.caption ?? '',
            location: post.location ?? '',
            visibility: post.visibility,
            media: post.UploadedAsset.map(m => ({
                id: m.id,
                publicId: m.publicId,
                type: m.type,
                fileName: m.fileName,
                url: m.url,
                secureUrl: m.secureUrl,
                format: m.format,
                width: m.width ?? null,
                height: m.height ?? null,
                duration: m.duration ?? null,
                fileSize: m.fileSize,
            })),
            timestamp: post.createdDate?.toISOString() || new Date().toISOString(),
            likes: likesCount,
            comments: mappedComments,
            commentsCount: comments.length,
            isLiked: !!existingLike,
            isSaved: !!existingSave,
        };

        return dto;
    }

    async getPosts(userId: number, currentUserId?: number): Promise<PostDto[]> {
        const posts = await this.prisma.post.findMany({
            where: { userId: Number(userId) },
            include: { UploadedAsset: true, User: true },
            orderBy: { createdDate: 'desc' },
        });

        // Map posts and fetch counts/status per post
        const mapped = await Promise.all(
            posts.map(async post => {
                const [likesCount, comments, existingLike, existingSave] = await Promise.all([
                    this.prisma.postLike.count({ where: { postId: post.id } }),
                    this.prisma.comment.findMany({
                        where: { postId: post.id },
                        orderBy: { createdAt: 'asc' },
                        include: { User: true },
                    }),
                    currentUserId
                        ? this.prisma.postLike.findUnique({
                            where: { actorId_postId: { actorId: Number(currentUserId), postId: post.id } },
                        })
                        : Promise.resolve(null),
                    currentUserId
                        ? this.prisma.postSave.findUnique({
                            where: { actorId_postId: { actorId: Number(currentUserId), postId: post.id } },
                        })
                        : Promise.resolve(null),
                ]);

                const mappedComments: CommentDto[] = comments.map(c => ({
                    id: c.id,
                    postId: c.postId,
                    userId: c.userId,
                    username: c.User?.userName || '',
                    userAvatar: c.User?.avatar || '',
                    content: c.content,
                    replyTo: null,
                    createdAt: c.createdAt?.toISOString() || '',
                    updatedAt: c.updatedAt?.toISOString() || '',
                }));

                return {
                    id: post.id,
                    userId: post.userId,
                    username: post.User?.userName || '',
                    userAvatar: post.User?.avatar || '',
                    caption: post.caption ?? '',
                    location: post.location ?? '',
                    visibility: post.visibility,
                    media: post.UploadedAsset.map(m => ({
                        id: m.id,
                        publicId: m.publicId,
                        type: m.type,
                        fileName: m.fileName,
                        url: m.url,
                        secureUrl: m.secureUrl,
                        format: m.format,
                        width: m.width ?? null,
                        height: m.height ?? null,
                        duration: m.duration ?? null,
                        fileSize: m.fileSize,
                    })),
                    timestamp: post.createdDate?.toISOString() || new Date().toISOString(),
                    likes: likesCount,
                    commentsCount: comments.length,
                    comments: mappedComments,
                    isLiked: !!existingLike,
                    isSaved: !!existingSave,
                } as PostDto;
            }),
        );

        return mapped;
    }

    async toggleLike(postId: string, userId: number) {
        // Check if post exists
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new Error('Post not found');
        }

        // Check if user already liked
        const existingLike = await this.prisma.postLike.findUnique({
            where: { actorId_postId: { actorId: userId, postId } },
        });

        if (existingLike) {
            // Remove like
            await this.prisma.postLike.delete({ where: { id: existingLike.id } });
        } else {
            // Add like
            await this.prisma.postLike.create({
                data: { actorId: userId, postId },
            });
        }

        // Get updated like count
        const likesCount = await this.prisma.postLike.count({ where: { postId } });
        const isLiked = !existingLike;

        return { postId, userId, isLiked, likesCount };
    }

    async toggleSave(postId: string, userId: number) {
        // Check if post exists
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new Error('Post not found');
        }

        // Check if user already saved
        const existingSave = await this.prisma.postSave.findUnique({
            where: { actorId_postId: { actorId: userId, postId } },
        });

        if (existingSave) {
            // Remove save
            await this.prisma.postSave.delete({ where: { id: existingSave.id } });
        } else {
            // Add save
            await this.prisma.postSave.create({
                data: { actorId: userId, postId },
            });
        }

        // Get updated save count
        const savesCount = await this.prisma.postSave.count({ where: { postId } });
        const isSaved = !existingSave;

        return { postId, userId, isSaved, savesCount };
    }
}
