import { Expose } from 'class-transformer';

export class MediaDto {
  @Expose()
  id: string;

  @Expose()
  publicId: string;

  @Expose()
  type: string;

  @Expose()
  fileName: string;

  @Expose()
  url: string;

  @Expose()
  secureUrl: string;

  @Expose()
  format: string;

  @Expose()
  width: number | null;

  @Expose()
  height: number | null;

  @Expose()
  duration?: number | null;

  @Expose()
  fileSize: number;
}

export class CommentDto {
  @Expose()
  id: number;

  @Expose()
  userId: number;

  @Expose()
  username: string;

  @Expose()
  userAvatar: string | null;

  @Expose()
  text: string;

  @Expose()
  likesCount: number;

  @Expose()
  repliesCount: number;

  @Expose()
  isLiked: boolean;

  @Expose()
  replyTo: string | null;

  @Expose()
  createdAt: string;

  @Expose()
  updatedAt: string;
}

export class PostDto {
  @Expose()
  id: string;

  @Expose()
  userId: number;

  @Expose()
  username: string;

  @Expose()
  userAvatar: string;

  @Expose()
  caption?: string | null;

  @Expose()
  location?: string | null;

  @Expose()
  visibility?: string | null;

  @Expose()
  isLikesHidden?: boolean | null;

  @Expose()
  isCommentsDisabled?: boolean | null;

  @Expose()
  media: MediaDto[];

  @Expose()
  timestamp: string;

  @Expose()
  likes: number;

  @Expose()
  commentsCount: number;

  @Expose()
  comments: CommentDto[];

  @Expose()
  isLiked: boolean;

  @Expose()
  isSaved: boolean;

  @Expose()
  isFollowing?: boolean;
}
