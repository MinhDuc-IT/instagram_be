import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ConversationDto } from './dto/conversation.dto';
import { MessageDto, SendMessageDto } from './dto/message.dto';
import { CreateConversationDto } from './dto/conversation.dto';
import {
  TransformResponseDto,
  ResponseMessage,
} from '../../core/decorators/response.decorator';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách conversations của user đăng nhập' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách conversations thành công',
    type: [ConversationDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @TransformResponseDto(ConversationDto)
  @ResponseMessage('Lấy danh sách conversations thành công')
  async getConversations(@Req() req: any): Promise<ConversationDto[]> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return this.messageService.getConversations(userId);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo hoặc lấy conversation với một user' })
  @ApiResponse({
    status: 201,
    description: 'Tạo/lấy conversation thành công',
    type: ConversationDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: CreateConversationDto })
  @TransformResponseDto(ConversationDto)
  @ResponseMessage('Tạo/lấy conversation thành công')
  async getOrCreateConversation(
    @Req() req: any,
    @Body() createDto: CreateConversationDto,
  ): Promise<ConversationDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return this.messageService.getOrCreateConversation(userId, createDto);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'Lấy danh sách tin nhắn trong một conversation với pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tin nhắn thành công',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ResponseMessage('Lấy danh sách tin nhắn thành công')
  async getMessages(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.messageService.getMessages(
      conversationId,
      userId,
      limitNum,
      offsetNum,
    );
  }

  @Post('conversations/:conversationId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn trong một conversation' })
  @ApiResponse({
    status: 201,
    description: 'Gửi tin nhắn thành công',
    type: MessageDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiBody({ type: SendMessageDto })
  @TransformResponseDto(MessageDto)
  @ResponseMessage('Gửi tin nhắn thành công')
  async sendMessage(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
    @Body() sendDto: SendMessageDto,
  ): Promise<MessageDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return this.messageService.sendMessage(conversationId, userId, sendDto);
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả tin nhắn trong conversation là đã đọc',
  })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu đã đọc thành công',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ResponseMessage('Đánh dấu đã đọc thành công')
  async markMessagesAsRead(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return this.messageService.markMessagesAsRead(conversationId, userId);
  }
}
