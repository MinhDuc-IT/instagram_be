import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FollowQueryDto } from './dto';

@Injectable()
export class FollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFollowRelation(followerId: number, followingId: number) {
    return this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async createFollow(followerId: number, followingId: number) {
    return this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async deleteFollow(followerId: number, followingId: number) {
    return this.prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  }

  async getFollowersCount(userId: number): Promise<number> {
    return this.prisma.follow.count({
      where: { followingId: userId },
    });
  }

  async getFollowingCount(userId: number): Promise<number> {
    return this.prisma.follow.count({
      where: { followerId: userId },
    });
  }

  async getFollowers(
    userId: number,
    query: FollowQueryDto,
    currentUserId?: number,
  ) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      followingId: userId,
      User_Follow_followerIdToUser: {
        deleted: false,
      },
    };

    if (search) {
      where.User_Follow_followerIdToUser.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          User_Follow_followerIdToUser: {
            select: {
              id: true,
              userName: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where }),
    ]);

    // Get follow status if currentUserId is provided
    let followStatusMap = new Map<number, boolean>();
    let followBackMap = new Map<number, boolean>();

    if (currentUserId) {
      const followerIds = followers.map((f) => f.followerId);
      const followRelations = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followerIds },
        },
        select: { followingId: true },
      });
      followRelations.forEach((rel) => {
        followStatusMap.set(rel.followingId, true);
      });

      // Check who follows back
      const followBackRelations = await this.prisma.follow.findMany({
        where: {
          followerId: { in: followerIds },
          followingId: currentUserId,
        },
        select: { followerId: true },
      });
      followBackRelations.forEach((rel) => {
        followBackMap.set(rel.followerId, true);
      });
    }

    return {
      data: followers.map((f) => ({
        id: f.User_Follow_followerIdToUser.id,
        userName: f.User_Follow_followerIdToUser.userName,
        fullName: f.User_Follow_followerIdToUser.fullName,
        avatar: f.User_Follow_followerIdToUser.avatar,
        isFollowing: currentUserId
          ? followStatusMap.get(f.followerId) || false
          : false,
        isFollowedBy: currentUserId
          ? followBackMap.get(f.followerId) || false
          : false,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(
    userId: number,
    query: FollowQueryDto,
    currentUserId?: number,
  ) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      followerId: userId,
      User_Follow_followingIdToUser: {
        deleted: false,
      },
    };

    if (search) {
      where.User_Follow_followingIdToUser.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          User_Follow_followingIdToUser: {
            select: {
              id: true,
              userName: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where }),
    ]);

    // Get follow status if currentUserId is provided
    let followStatusMap = new Map<number, boolean>();
    let followBackMap = new Map<number, boolean>();

    if (currentUserId && currentUserId !== userId) {
      const followingIds = following.map((f) => f.followingId);
      const followRelations = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followingIds },
        },
        select: { followingId: true },
      });
      followRelations.forEach((rel) => {
        followStatusMap.set(rel.followingId, true);
      });

      // Check who follows back
      const followBackRelations = await this.prisma.follow.findMany({
        where: {
          followerId: { in: followingIds },
          followingId: currentUserId,
        },
        select: { followerId: true },
      });
      followBackRelations.forEach((rel) => {
        followBackMap.set(rel.followerId, true);
      });
    }

    return {
      data: following.map((f) => ({
        id: f.User_Follow_followingIdToUser.id,
        userName: f.User_Follow_followingIdToUser.userName,
        fullName: f.User_Follow_followingIdToUser.fullName,
        avatar: f.User_Follow_followingIdToUser.avatar,
        isFollowing:
          currentUserId && currentUserId !== userId
            ? followStatusMap.get(f.followingId) || false
            : true,
        isFollowedBy:
          currentUserId && currentUserId !== userId
            ? followBackMap.get(f.followingId) || false
            : false,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSuggestedUsers(userId: number, limit: number = 10) {
    // Get users that current user is not following yet
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Find users with most followers that current user is not following
    const suggestions = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: followingIds,
        },
        deleted: false,
      },
      select: {
        id: true,
        userName: true,
        fullName: true,
        avatar: true,
        _count: {
          select: {
            Follow_Follow_followingIdToUser: true,
          },
        },
      },
      orderBy: {
        Follow_Follow_followingIdToUser: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return suggestions.map((user) => ({
      id: user.id,
      userName: user.userName,
      fullName: user.fullName,
      avatar: user.avatar,
      followersCount: user._count.Follow_Follow_followingIdToUser,
    }));
  }

  async getMutualFollowers(
    userId: number,
    targetUserId: number,
    limit: number = 5,
  ) {
    // Find users that both userId and targetUserId follow
    const mutual = await this.prisma.user.findMany({
      where: {
        Follow_Follow_followingIdToUser: {
          some: {
            followerId: userId,
          },
        },
        AND: {
          Follow_Follow_followingIdToUser: {
            some: {
              followerId: targetUserId,
            },
          },
        },
        deleted: false,
      },
      select: {
        id: true,
        userName: true,
        fullName: true,
        avatar: true,
      },
      take: limit,
    });

    return mutual;
  }

  async getUserProfile(userId: number, currentUserId?: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted: false,
      },
      select: {
        id: true,
        userName: true,
        fullName: true,
        avatar: true,
        email: true,
        phone: true,
        gender: true,
        Post: {
          where: { deleted: false },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Get follow counts
    const [followersCount, followingCount] = await Promise.all([
      this.getFollowersCount(userId),
      this.getFollowingCount(userId),
    ]);

    // Get follow status if currentUserId is provided
    let isFollowing = false;
    let isFollowedBy = false;

    if (currentUserId && currentUserId !== userId) {
      const [followRel, followBackRel] = await Promise.all([
        this.findFollowRelation(currentUserId, userId),
        this.findFollowRelation(userId, currentUserId),
      ]);
      isFollowing = !!followRel;
      isFollowedBy = !!followBackRel;
    }

    return {
      id: user.id,
      userName: user.userName,
      fullName: user.fullName,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      followersCount,
      followingCount,
      postsCount: user.Post.length,
      isFollowing,
      isFollowedBy,
      isOwnProfile: currentUserId === userId,
    };
  }
}
