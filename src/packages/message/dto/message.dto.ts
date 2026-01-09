import { ApiProperty } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ description: 'Loại tin nhắn: text, image, etc.' })
  messageType: string;

  @ApiProperty({ required: false })
  mediaUrl?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung tin nhắn', required: false })
  content?: string;

  @ApiProperty({ description: 'Loại tin nhắn', default: 'text' })
  messageType?: string;

  @ApiProperty({ description: 'URL của file media', required: false })
  mediaUrl?: string;
}

export class SendMessageToUserDto {
  @ApiProperty({ description: 'ID của người nhận' })
  recipientId: number;

  @ApiProperty({ description: 'Nội dung tin nhắn', required: false })
  content?: string;

  @ApiProperty({ description: 'Loại tin nhắn', default: 'text' })
  messageType?: string;

  @ApiProperty({ description: 'URL của file media', required: false })
  mediaUrl?: string;
}
