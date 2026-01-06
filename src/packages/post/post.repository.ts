import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { POST_VISIBILITY } from './common/enums/post-visibility.enum';

@Injectable()
export class PostRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.PostCreateInput) {
        return this.prisma.post.create({ data });
    }

    async findAll(filter?: Prisma.PostWhereInput) {
        return this.prisma.post.findMany({
            where: { deleted: false, ...filter },
            include: { UploadedAsset: true, User: true },
            orderBy: { createdDate: 'desc' },
        });
    }

    async findById(id: string) {
        return this.prisma.post.findUnique({
            where: { id },
            include: { UploadedAsset: true, User: true },
        });
    }

    async update(id: string, data: Prisma.PostUpdateInput) {
        return this.prisma.post.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string) {
        return this.prisma.post.update({
            where: { id },
            data: {
                deleted: true,
            },
        });
    }

    // Guest (chưa login)
    async getPublicPostsRandom(skip: number, limit: number) {
        return this.prisma.post.findMany({
            where: {
                deleted: false,
                visibility: 'public',
            },
            orderBy: { createdDate: 'desc' },
            skip: skip,
            take: limit,
            include: {
                User: {
                    select: {
                        id: true,
                        userName: true,
                        avatar: true,
                    },
                },
                UploadedAsset: true,
            },
        });
    }

    // User đã login
    async getHomeFeedForUser(
        viewerId: number,
        skip: number,
        take: number,
    ) {
        return this.prisma.post.findMany({
            where: {
                deleted: false,
                OR: [
                    // Post của chính mình
                    { userId: viewerId },

                    // Public
                    { visibility: 'public' },

                    // Followers only
                    {
                        visibility: 'followers',
                        User: {
                            Follow_Follow_followingIdToUser: {
                                some: {
                                    followerId: viewerId,
                                },
                            },
                        },
                    },
                ],
            },
            orderBy: { createdDate: 'desc' },
            skip,
            take,
            include: {
                User: {
                    select: {
                        id: true,
                        userName: true,
                        avatar: true,
                        Follow_Follow_followingIdToUser: {
                            where: { followerId: viewerId },
                            select: { id: true },
                        },
                    },
                },
                UploadedAsset: true,
                PostLike: {
                    where: { actorId: viewerId },
                },
                postSaves: {
                    where: { actorId: viewerId },
                },
                _count: {
                    select: {
                        PostLike: true,
                        Comment: true,
                    },
                },
            },
        });
    }

    async countHomeFeedForUser(viewerId: number): Promise<number> {
        return this.prisma.post.count({
            where: {
                deleted: false,
                OR: [
                    { userId: viewerId },
                    { visibility: 'public' },
                    {
                        visibility: 'followers',
                        User: {
                            Follow_Follow_followingIdToUser: {
                                some: {
                                    followerId: viewerId,
                                },
                            },
                        },
                    },
                ],
            },
        });
    }

    async countPublicPosts(): Promise<number> {
        return this.prisma.post.count({
            where: {
                deleted: false,
                visibility: 'public',
            },
        });
    }
}
