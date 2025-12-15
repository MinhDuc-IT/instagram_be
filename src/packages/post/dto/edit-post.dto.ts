import { IsOptional, IsString, IsArray, IsBoolean, IsIn } from 'class-validator';

export class EditPostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsArray()
  mediaIds?: string[];

  @IsOptional()
  @IsBoolean()
  isCommentsDisabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isLikesHidden?: boolean;

  @IsOptional()
  @IsIn(['public', 'followers', 'private'])
  visibility?: 'public' | 'followers' | 'private';
}
