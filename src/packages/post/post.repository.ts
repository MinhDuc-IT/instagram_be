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

    async getHomeFeed(userId: number, skip: number, take: number) {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);

        return this.prisma.post.findMany({
            where: {
                deleted: false,
                OR: [
                    // Post của chính mình
                    { userId },

                    // Post của người mình follow
                    {
                        userId: { in: followingIds },
                        visibility: {
                            in: [
                                POST_VISIBILITY.PUBLIC,
                                POST_VISIBILITY.FOLLOWERS
                            ]
                        }
                    }
                ]
            },
            orderBy: { createdDate: 'desc' },
            skip,
            take,
            include: {
                User: {
                    select: {
                        id: true,
                        userName: true,
                        avatar: true
                    }
                },
                UploadedAsset: true,
                PostLike: {
                    where: { actorId: userId }
                },
                _count: {
                    select: {
                        PostLike: true,
                        Comment: true
                    }
                }
            }
        });
    }
}
