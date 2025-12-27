import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class StoryRepository {
    constructor(private prisma: PrismaService) { }

    async getHomeStories(
        userId: number,
        page: number,
        limit: number,
    ) {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });

        const userIds = [userId, ...following.map(f => f.followingId)];

        const whereCondition = {
            userId: { in: userIds },
            createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
        };

        const stories = await this.prisma.story.findMany({
            where: whereCondition,
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                User: {
                    select: {
                        id: true,
                        userName: true,
                        avatar: true
                    }
                },
                StoryView: {
                    where: { actorId: userId },
                    select: { id: true }
                },
                StoryLike: {
                    where: { actorId: userId },
                    select: { id: true },
                },
            },
        });

        return stories;
    }

    async countHomeStoriesForUser(userId: number): Promise<number> {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });

        const userIds = [userId, ...following.map(f => f.followingId)];

        return this.prisma.story.count({
            where: {
                userId: { in: userIds },
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            },
        });
    }

    async upsertView(userId: number, storyId: number) {
        return this.prisma.storyView.upsert({
            where: {
                actorId_storyId: { actorId: userId, storyId }
            },
            update: {},
            create: { actorId: userId, storyId }
        });
    }

    async toggleLike(userId: number, storyId: number) {
        const liked = await this.prisma.storyLike.findUnique({
            where: {
                actorId_storyId: { actorId: userId, storyId }
            }
        });

        if (liked) {
            await this.prisma.storyLike.delete({
                where: {
                    actorId_storyId: { actorId: userId, storyId }
                }
            });
            return false;
        }

        await this.prisma.storyLike.create({
            data: { actorId: userId, storyId }
        });

        return true;
    }
}
