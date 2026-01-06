import { Expose } from 'class-transformer';

export class GetUserDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  avatar: string;

  @Expose()
  fullName: string;

  @Expose()
  bio: string;

  @Expose()
  followers: number;

  @Expose()
  following: number;

  @Expose()
  posts: number;

  @Expose()
  website: string;

  @Expose()
  isFollowing: boolean;

  @Expose()
  createdAt: string;
}
