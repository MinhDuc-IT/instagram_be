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

        // Approach: Find users who have active stories first (User-centric query)
        // This is better for the "Story Bar" which lists Users.

        // We need to support sorting (Unseen first, then Recent). 
        // Doing this efficiently with pagination requires a specific query strategy or Raw SQL.
        // For simplicity/maintainability with Prisma, we'll fetch users valid stories, 
        // but to ensure 'unseen' sorting works across pages, we might need a raw query or fetching relevant IDs first.

        // Let's optimize: Fetch aggregates first?
        // Or simpler: Fetch all valid stories (lightweight) -> Group in memory -> Sort -> Paginate.
        // If the scale is small (hundreds of follows), this is fast. 
        // If scale is millions, we need Raw SQL. Assuming "Clone" scale for strict logic correctness:

        // Let's try Prisma's `findMany` on User with `where` clause for Stories.

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

    // countHomeStoriesForUser method removed as we are changing pagination strategy in Service


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
