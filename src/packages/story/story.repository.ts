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

        const targetUserIds = [userId, ...following.map(f => f.followingId)];
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const usersWithStories = await this.prisma.user.findMany({
            where: {
                id: { in: targetUserIds },
                Story: {
                    some: {
                        createdAt: { gte: twentyFourHoursAgo }
                    }
                }
            },
            select: {
                id: true,
                userName: true,
                avatar: true,
                Story: {
                    where: { createdAt: { gte: twentyFourHoursAgo } },
                    orderBy: { createdAt: 'asc' }, // Chronological order for viewing
                    include: {
                        StoryView: {
                            where: { actorId: userId },
                            select: { id: true, viewedAt: true }
                        },
                        StoryLike: {
                            where: { actorId: userId },
                            select: { id: true }
                        },
                    }
                }
            }
        });

        return usersWithStories;
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
