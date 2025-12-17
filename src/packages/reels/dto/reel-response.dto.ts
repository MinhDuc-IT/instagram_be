import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReelUserDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  userName: string;

  @Expose()
  @ApiProperty()
  fullName?: string;

  @Expose()
  @ApiProperty()
  avatar?: string;
}

export class ReelVideoDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  url: string;

  @Expose()
  @ApiProperty()
  secureUrl: string;

  @Expose()
  @ApiProperty()
  width?: number;

  @Expose()
  @ApiProperty()
  height?: number;

  @Expose()
  @ApiProperty()
  duration?: number;

  @Expose()
  @ApiProperty()
  format: string;

  @Expose()
  @ApiProperty()
  fileSize: number;
}

export class ReelCommentUserDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  userName: string;

  @Expose()
  @ApiProperty()
  avatar?: string;
}

export class ReelCommentDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  content: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty({ type: () => ReelCommentUserDto })
  @Type(() => ReelCommentUserDto)
  User: ReelCommentUserDto;

  @Expose()
  @ApiProperty()
  likesCount: number;

  @Expose()
  @ApiProperty()
  repliesCount: number;
}

export class ReelDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  caption?: string;

  @Expose()
  @ApiProperty()
  location?: string;

  @Expose()
  @ApiProperty()
  createdDate: Date;

  @Expose()
  @ApiProperty({ type: () => ReelUserDto })
  @Type(() => ReelUserDto)
  User: ReelUserDto;

  @Expose()
  @ApiProperty({ type: () => ReelVideoDto })
  @Type(() => ReelVideoDto)
  video: ReelVideoDto;

  @Expose()
  @ApiProperty()
  likesCount: number;

  @Expose()
  @ApiProperty()
  commentsCount: number;

  @Expose()
  @ApiProperty()
  savesCount: number;

  // @Expose()
  // @ApiProperty({ type: [ReelCommentDto] })
  // @Type(() => ReelCommentDto)
  // topComments: ReelCommentDto[];

  @Expose()
  @ApiProperty()
  isLiked?: boolean;

  @Expose()
  @ApiProperty()
  isSaved?: boolean;
}

export class ReelsPaginationResponseDto {
  @Expose()
  @ApiProperty({ type: [ReelDto] })
  @Type(() => ReelDto)
  data: ReelDto[];

  @Expose()
  @ApiProperty({ nullable: true })
  nextCursor: string | null;

  @Expose()
  @ApiProperty()
  hasMore: boolean;
}
