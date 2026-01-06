import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FollowRepository } from './follow.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  FollowQueryDto,
  FollowActionResponseDto,
  FollowStatsDto,
  FollowStatusDto,
  UserProfileWithStatsDto,
} from './dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class FollowService {
  private readonly logger = new Logger(FollowService.name);

  constructor(
    private readonly followRepository: FollowRepository,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async toggleFollow(
    currentUserId: number,
    targetUserId: number,
  ): Promise<FollowActionResponseDto> {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        deleted: false,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.followRepository.findFollowRelation(
      currentUserId,
      targetUserId,
    );

    let isFollowing: boolean;
    let message: string;

    if (existingFollow) {
      await this.followRepository.deleteFollow(currentUserId, targetUserId);
      isFollowing = false;
      message = 'Unfollowed successfully';
    } else {
      await this.followRepository.createFollow(currentUserId, targetUserId);
      isFollowing = true;
      message = 'Followed successfully';

      // Tạo notification cho người được follow (chỉ khi follow, không phải unfollow)
      try {
        // Lấy thông tin user đang follow
        const follower = await this.prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, userName: true, fullName: true },
        });

        if (follower) {
          const senderName = follower.fullName || follower.userName;
          await this.notificationService.createNotification({
            receiverId: targetUserId,
            senderId: currentUserId,
            type: 'follow',
            content: `${senderName} đã theo dõi bạn`,
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error creating follow notification: ${errorMessage}`,
        );
        // Không throw error để không ảnh hưởng đến flow chính
      }
    }

    // Get updated counts
    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.getFollowersCount(targetUserId),
      this.followRepository.getFollowingCount(currentUserId),
    ]);

    return {
      success: true,
      message,
      isFollowing,
      followersCount,
      followingCount,
    };
  }

  /**
   * Get followers list of a user
   */
  async getFollowers(
    userId: number,
    query: FollowQueryDto,
    currentUserId?: number,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.followRepository.getFollowers(userId, query, currentUserId);
  }

  /**
   * Get following list of a user
   */
  async getFollowing(
    userId: number,
    query: FollowQueryDto,
    currentUserId?: number,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.followRepository.getFollowing(userId, query, currentUserId);
  }

  /**
   * Get follow statistics
   */
  async getFollowStats(userId: number): Promise<FollowStatsDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.getFollowersCount(userId),
      this.followRepository.getFollowingCount(userId),
    ]);

    return {
      followersCount,
      followingCount,
    };
  }

  /**
   * Check follow status between two users
   */
  async getFollowStatus(
    currentUserId: number,
    targetUserId: number,
  ): Promise<FollowStatusDto> {
    if (currentUserId === targetUserId) {
      return {
        isFollowing: false,
        isFollowedBy: false,
      };
    }

    const [isFollowing, isFollowedBy] = await Promise.all([
      this.followRepository.findFollowRelation(currentUserId, targetUserId),
      this.followRepository.findFollowRelation(targetUserId, currentUserId),
    ]);

    return {
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
    };
  }

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(currentUserId: number, limit: number = 10) {
    return this.followRepository.getSuggestedUsers(currentUserId, limit);
  }

  /**
   * Get mutual followers
   */
  async getMutualFollowers(
    currentUserId: number,
    targetUserId: number,
    limit: number = 5,
  ) {
    return this.followRepository.getMutualFollowers(
      currentUserId,
      targetUserId,
      limit,
    );
  }

  /**
   * Remove a follower
   */
  async removeFollower(
    currentUserId: number,
    followerId: number,
  ): Promise<FollowActionResponseDto> {
    if (currentUserId === followerId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    const existingFollow = await this.followRepository.findFollowRelation(
      followerId,
      currentUserId,
    );

    if (!existingFollow) {
      throw new NotFoundException('This user is not following you');
    }

    await this.followRepository.deleteFollow(followerId, currentUserId);

    const [followersCount, followingCount] = await Promise.all([
      this.followRepository.getFollowersCount(currentUserId),
      this.followRepository.getFollowingCount(followerId),
    ]);

    return {
      success: true,
      message: 'Follower removed successfully',
      isFollowing: false,
      followersCount,
      followingCount,
    };
  }

  /**
   * Get user profile with follow statistics
   */
  async getUserProfile(
    userId: number,
    currentUserId?: number,
  ): Promise<UserProfileWithStatsDto> {
    const profile = await this.followRepository.getUserProfile(
      userId,
      currentUserId,
    );

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return profile as UserProfileWithStatsDto;
  }
}
