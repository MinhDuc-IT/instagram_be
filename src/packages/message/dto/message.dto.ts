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

    @ApiProperty()
    createdAt: string;

    @ApiProperty()
    updatedAt: string;
}

export class SendMessageDto {
    @ApiProperty({ description: 'Nội dung tin nhắn' })
    content: string;
}

