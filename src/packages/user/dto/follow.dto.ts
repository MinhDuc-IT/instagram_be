import { Expose } from 'class-transformer';

export class FollowToggleResponse {
    @Expose()
    targetUserId: number;

    @Expose()
    followerUserId: number;

    @Expose()
    isFollowing: boolean;

    @Expose()
    followersCount: number;

    @Expose()
    followingCount?: number;
}
