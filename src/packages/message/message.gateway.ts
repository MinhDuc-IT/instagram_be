import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Const } from '../../common/Constants';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/messages',
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessageGateway.name);
  private readonly userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds (userId -> Tập hợp các socketIds)

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: AuthenticatedSocket) {
    try {
      // Trích xuất token từ handshake auth hoặc query
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace(
          'Bearer ',
          '',
        );

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Xác thực JWT token
      const payload = this.jwtService.verify<{ id?: number; sub?: number }>(
        token,
        {
          secret: this.configService.get<string>('JWT_SECRET'),
        },
      );
      const userId = payload.id || payload.sub;

      if (!userId || typeof userId !== 'number') {
        this.logger.warn(`Client ${client.id} connected with invalid token`);
        client.disconnect();
        return;
      }

      // Gắn userId vào socket
      client.userId = userId;

      // Theo dõi các socket của người dùng
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling connection: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const sockets = this.userSockets.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(
        `Client ${client.id} disconnected for user ${client.userId}`,
      );
    }
  }

  /**
   * Tham gia vào phòng cuộc hội thoại
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    await client.join(room);
    this.logger.log(
      `User ${client.userId} joined conversation ${data.conversationId}`,
    );
    return { success: true, conversationId: data.conversationId };
  }

  /**
   * Tham gia vào phòng bài đăng
   */
  @SubscribeMessage('join_post')
  async handleJoinPost(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { postId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `${Const.POST}:${data.postId}`;
    await client.join(room);
    this.logger.log(`User ${client.userId} joined post ${data.postId}`);
    return { success: true, postId: data.postId };
  }

  /**
   * Rời khỏi phòng bài đăng
   */
  @SubscribeMessage('leave_post')
  async handleLeavePost(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { postId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `${Const.POST}:${data.postId}`;
    await client.leave(room);
    this.logger.log(`User ${client.userId} left post ${data.postId}`);
    return { success: true, postId: data.postId };
  }

  /**
   * Broadcast comment mới tới tất cả users trong room
   */
  @SubscribeMessage('new_comment')
  async handleNewComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { postId: string; comment: any },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `${Const.POST}:${data.postId}`;

    // Broadcast comment mới tới tất cả users trong room này
    // (gồm cả user vừa comment)
    this.server.to(room).emit('comment_added', {
      postId: data.postId,
      comment: data.comment,
      timestamp: new Date(),
    });

    this.logger.log(
      `New comment on post ${data.postId} from user ${client.userId}`,
    );

    return { success: true };
  }

  /**
   * Lắng nghe khi user xóa comment
   */
  @SubscribeMessage('delete_comment')
  async handleDeleteComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { postId: string; commentId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `post:${data.postId}`;

    this.server.to(room).emit('comment_deleted', {
      postId: data.postId,
      commentId: data.commentId,
      timestamp: new Date(),
    });

    this.logger.log(
      `Comment ${data.commentId} deleted from post ${data.postId}`,
    );

    return { success: true };
  }

  /**
   * Rời khỏi phòng cuộc hội thoại
   */
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    await client.leave(room);
    this.logger.log(
      `User ${client.userId} left conversation ${data.conversationId}`,
    );
    return { success: true, conversationId: data.conversationId };
  }

  /**
   * Phát tin nhắn mới đến phòng cuộc hội thoại
   */
  emitNewMessage(conversationId: number, message: unknown) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('new_message', message);
    this.logger.log(`Emitted new message to conversation ${conversationId}`);
  }

  /**
   * Gửi trạng thái đã đọc tin nhắn
   */
  emitMessageRead(conversationId: number, userId: number, readCount: number) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('messages_read', {
      conversationId,
      userId,
      readCount,
    });
    this.logger.log(`Emitted messages read for conversation ${conversationId}`);
  }

  /**
   * Lấy tất cả socket IDs của một người dùng
   */
  getUserSocketIds(userId: number): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Xử lý sự kiện bắt đầu gõ
   */
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    // Phát đến tất cả client trong phòng trừ người gửi
    client.to(room).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId.toString(),
      isTyping: true,
    });

    return { success: true };
  }

  /**
   * Xử lý sự kiện dừng gõ
   */
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    // Phát đến tất cả client trong phòng trừ người gửi
    client.to(room).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId.toString(),
      isTyping: false,
    });

    return { success: true };
  }

  /**
   * Broadcast comment mới tới tất cả users trong post room (gọi từ CommentService)
   */
  handleNewCommentBroadcast(
    postId: string,
    comment: any,
    userId?: number | null,
  ) {
    const room = `${Const.POST}:${postId}`;
    this.server.to(room).emit(`${Const.COMMENT_ADDED}`, {
      postId,
      comment,
      timestamp: new Date(),
    });
    this.logger.log(`Broadcast new comment to post ${postId}`);
  }
}
