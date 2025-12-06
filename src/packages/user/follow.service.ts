import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class FollowService {
    constructor(private readonly prisma: PrismaService) { }

    async toggleFollow(targetUserId: number, followerUserId: number) {
        // Validate: cannot follow yourself
        if (targetUserId === followerUserId) {
            throw new BadRequestException('Cannot follow yourself');
        }

        // Check if target user exists
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });
        if (!targetUser) {
            throw new NotFoundException('Target user not found');
        }

        // Check if already following
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: followerUserId,
                    followingId: targetUserId,
                },
            },
        });

        if (existingFollow) {
            // Remove follow
            await this.prisma.follow.delete({ where: { id: existingFollow.id } });
        } else {
            // Add follow
            await this.prisma.follow.create({
                data: {
                    followerId: followerUserId,
                    followingId: targetUserId,
                },
            });
        }

        // Get updated counts
        const followersCount = await this.prisma.follow.count({
            where: { followingId: targetUserId },
        });
        const followingCount = await this.prisma.follow.count({
            where: { followerId: followerUserId },
        });
        const isFollowing = !existingFollow;

        return {
            targetUserId,
            followerUserId,
            isFollowing,
            followersCount,
            followingCount,
        };
    }

    async getFollowStats(userId: number) {
        const followersCount = await this.prisma.follow.count({
            where: { followingId: userId },
        });
        const followingCount = await this.prisma.follow.count({
            where: { followerId: userId },
        });

        return { followersCount, followingCount };
    }

    async isFollowing(followerUserId: number, targetUserId: number) {
        const follow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: followerUserId,
                    followingId: targetUserId,
                },
            },
        });

        return !!follow;
    }
}
