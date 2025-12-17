import { Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class CreateCommentRequest {
  text: string;
  replyToCommentId?: string;
}

export class CommentUserDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  userName: string;

  @Expose()
  @ApiPropertyOptional()
  avatar?: string;
}

export class CommentDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  postId: string;

  @Expose()
  @ApiProperty()
  userId: number;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiPropertyOptional()
  userAvatar?: string;

  @Expose()
  @ApiProperty()
  text: string;

  @Expose()
  @ApiPropertyOptional()
  replyTo?: number | null;

  @Expose()
  @ApiPropertyOptional()
  replyToCommentId?: number | null;

  @Expose()
  @ApiPropertyOptional({ type: () => CommentUserDto })
  @Type(() => CommentUserDto)
  replyToUser?: CommentUserDto | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Id của comment gốc trong thread' })
  rootCommentId?: number;

  @Expose()
  @ApiProperty()
  createdAt: string;

  @Expose()
  @ApiProperty()
  updatedAt: string;

  @Expose()
  @ApiProperty()
  likesCount: number;

  @Expose()
  @ApiProperty()
  repliesCount: number;

  @Expose()
  @ApiPropertyOptional()
  isLiked?: boolean;

  @Expose()
  @ApiPropertyOptional({ type: () => [CommentDto] })
  @Type(() => CommentDto)
  replies?: CommentDto[];
}

export class GetCommentsQueryDto {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Số lượng comments cần lấy (mặc định 20)',
    example: 20,
    default: 20,
  })
  limit?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Cursor ID của comment cuối cùng để load thêm',
    example: '123',
  })
  cursor?: string;
}

export class GetCommentsResponse {
  @Expose()
  @ApiProperty({ type: [CommentDto] })
  @Type(() => CommentDto)
  comments: CommentDto[];

  @Expose()
  @ApiProperty()
  nextCursor: string | null;

  @Expose()
  @ApiProperty()
  hasMore: boolean;

  @Expose()
  @ApiProperty()
  total: number;
}
