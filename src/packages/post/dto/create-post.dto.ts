import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'Caption', type: 'string' })
  caption?: string;

  @ApiPropertyOptional({ description: 'Location', type: 'string' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Visibility',
    enum: ['public', 'private', 'friends'],
    default: 'public',
  })
  visibility?: 'public' | 'private' | 'friends';

  @ApiPropertyOptional({
    description: 'Ẩn số lượng lượt thích',
    type: 'boolean',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isLikesHidden?: boolean;

  @ApiPropertyOptional({
    description: 'Tắt bình luận cho bài viết',
    type: 'boolean',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCommentsDisabled?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách file upload (ảnh/video)',
    type: 'string',
    format: 'binary',
    isArray: true,
  })
  @IsOptional()
  files?: Express.Multer.File[];
}
