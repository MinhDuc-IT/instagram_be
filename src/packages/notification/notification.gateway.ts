import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationDto } from './dto/notification.dto';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log(
      'NotificationGateway initialized with namespace /notifications',
    );
  }

  afterInit(server: Server) {
    // Đảm bảo server được set (có thể @WebSocketServer() chưa inject kịp)
    this.server = server;
    this.logger.log(
      `NotificationGateway afterInit - namespace /notifications is ready. Server initialized: ${!!this.server}`,
    );
  }

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

      // Join room của user để nhận notifications
      void client.join(`user:${userId}`);

      this.logger.log(
        `Notification client ${client.id} connected for user ${userId}`,
      );
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
        `Notification client ${client.id} disconnected for user ${client.userId}`,
      );
    }
  }

  /**
   * Emit notification đến user cụ thể
   */
  emitNotification(userId: number, notification: NotificationDto) {
    if (!this.server) {
      this.logger.error(
        `Cannot emit notification: server is not initialized. Notification ID: ${notification.id}`,
      );
      return;
    }

    const room = `user:${userId}`;
    // Kiểm tra số clients trong room (nếu có thể)
    let clientsCount = 0;
    try {
      if (this.server.sockets?.adapter?.rooms) {
        const clientsInRoom = this.server.sockets.adapter.rooms.get(room);
        clientsCount = clientsInRoom?.size || 0;
      }
    } catch {
      // Bỏ qua nếu không thể lấy số clients
    }
    this.logger.log(
      `Emitting notification ${notification.id} to user ${userId} in room ${room}. Clients in room: ${clientsCount}`,
    );
    this.logger.log(
      `Notification data:`,
      JSON.stringify(notification, null, 2),
    );
    this.server.to(room).emit('new_notification', notification);
    this.logger.log(
      `Emitted notification ${notification.id} to user ${userId}`,
    );
  }

  /**
   * Emit số lượng unread notifications
   */
  emitUnreadCount(userId: number, count: number) {
    if (!this.server) {
      this.logger.error(
        `Cannot emit unread count: server is not initialized. User ID: ${userId}`,
      );
      return;
    }

    const room = `user:${userId}`;
    this.server.to(room).emit('unread_count', { count });
    this.logger.log(`Emitted unread count ${count} to user ${userId}`);
  }

  /**
   * Lấy tất cả socket IDs của một người dùng
   */
  getUserSocketIds(userId: number): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Emit message notification đến user cụ thể (không lưu DB, chỉ để hiển thị badge ở trang message)
   */
  emitMessageNotification(
    userId: number,
    senderId: number,
    senderName: string,
    conversationId: number,
  ) {
    if (!this.server) {
      this.logger.error(
        `Cannot emit message notification: server is not initialized. User ID: ${userId}`,
      );
      return;
    }

    const room = `user:${userId}`;
    const messageNotification = {
      type: 'message',
      senderId,
      senderName,
      conversationId,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `Emitting message notification to user ${userId} in room ${room}`,
    );
    // Emit event riêng cho message notification (khác với new_notification)
    this.server.to(room).emit('new_message_notification', messageNotification);
    this.logger.log(`Emitted message notification to user ${userId}`);
  }
}
