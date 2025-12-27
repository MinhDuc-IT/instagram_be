import { ApiProperty } from '@nestjs/swagger';

export class FollowResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  fullName?: string;

  @ApiProperty()
  avatar?: string;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  isFollowedBy: boolean;
}

export class FollowStatsDto {
  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  followingCount: number;
}

export class FollowStatusDto {
  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  isFollowedBy: boolean;
}

export class FollowActionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  followingCount: number;
}
