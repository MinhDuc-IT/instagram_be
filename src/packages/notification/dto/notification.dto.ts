import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  receiverId: number;

  @ApiProperty()
  senderId: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  postId?: string;

  @ApiProperty({ required: false })
  commentId?: number;

  @ApiProperty({ required: false })
  sender?: {
    id: number;
    userName: string;
    fullName: string | null;
    avatar: string | null;
  };
}

export class CreateNotificationDto {
  receiverId: number;
  senderId: number;
  type: string;
  content: string;
  postId?: string;
  commentId?: number;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'ID của notification cần đánh dấu đã đọc' })
  notificationId: number;
}

