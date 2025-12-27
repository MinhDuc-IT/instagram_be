import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'Username' })
  userName: string;

  @ApiProperty({ description: 'Full name', nullable: true })
  fullName?: string;

  @ApiProperty({ description: 'Avatar URL', nullable: true })
  avatar?: string;

  @ApiProperty({ description: 'User bio/description', nullable: true })
  bio?: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiProperty({ description: 'Phone number', nullable: true })
  phone?: string;

  @ApiProperty({ description: 'Gender', nullable: true })
  gender?: number;
}

export class UserProfileWithStatsDto extends UserProfileDto {
  @ApiProperty({ description: 'Total number of followers' })
  followersCount: number;

  @ApiProperty({ description: 'Total number of users this user is following' })
  followingCount: number;

  @ApiProperty({ description: 'Total number of posts' })
  postsCount: number;

  @ApiProperty({
    description: 'Whether the current user is following this user',
  })
  isFollowing: boolean;

  @ApiProperty({
    description:
      'Whether this user is following the current user (follow back)',
  })
  isFollowedBy: boolean;

  @ApiProperty({ description: 'Whether this is the current user viewing' })
  isOwnProfile: boolean;
}
