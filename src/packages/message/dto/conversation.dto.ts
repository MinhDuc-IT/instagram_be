import { ApiProperty } from '@nestjs/swagger';

export class ParticipantDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  fullName?: string;

  @ApiProperty({ required: false })
  avatar?: string;
}

export class LastMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  createdAt: string;
}

export class ConversationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: ParticipantDto })
  participant: ParticipantDto;

  @ApiProperty({ type: LastMessageDto, required: false })
  lastMessage?: LastMessageDto;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  updatedAt: string;
}

export class CreateConversationDto {
  @ApiProperty({ description: 'ID của người dùng muốn nhắn tin' })
  participantId: number;
}
