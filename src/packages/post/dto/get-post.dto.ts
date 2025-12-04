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
  media: MediaDto[];

  @Expose()
  timestamp: string;

  @Expose()
  likes: number;

  @Expose()
  comments: any[];

  @Expose()
  isLiked: boolean;

  @Expose()
  isSaved: boolean;
}
