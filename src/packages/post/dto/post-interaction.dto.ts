import { Expose } from 'class-transformer';

export class PostLikeToggleResponse {
  @Expose()
  postId: string;

  @Expose()
  userId: number;

  @Expose()
  isLiked: boolean;

  @Expose()
  likesCount: number;
}

export class PostSaveToggleResponse {
  @Expose()
  postId: string;

  @Expose()
  userId: number;

  @Expose()
  isSaved: boolean;

  @Expose()
  savesCount: number;
}
