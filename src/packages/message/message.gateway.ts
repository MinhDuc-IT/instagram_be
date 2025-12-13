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
  private readonly userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
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

      // Verify JWT token
      const payload = this.jwtService.verify<{ id?: number; sub?: number }>(
        token,
      );
      const userId = payload.id || payload.sub;

      if (!userId || typeof userId !== 'number') {
        this.logger.warn(`Client ${client.id} connected with invalid token`);
        client.disconnect();
        return;
      }

      // Attach userId to socket
      client.userId = userId;

      // Track user sockets
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
   * Join a conversation room
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
   * Leave a conversation room
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
   * Emit new message to conversation room
   */
  emitNewMessage(conversationId: number, message: unknown) {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('new_message', message);
    this.logger.log(`Emitted new message to conversation ${conversationId}`);
  }

  /**
   * Emit message read status
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
   * Get all socket IDs for a user
   */
  getUserSocketIds(userId: number): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Handle typing start event
   */
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    // Emit to all clients in room except sender
    client.to(room).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId.toString(),
      isTyping: true,
    });

    return { success: true };
  }

  /**
   * Handle typing stop event
   */
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `conversation:${data.conversationId}`;
    // Emit to all clients in room except sender
    client.to(room).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId.toString(),
      isTyping: false,
    });

    return { success: true };
  }
}
