import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationDto, CreateNotificationDto } from './dto/notification.dto';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Tạo notification mới
   */
  async createNotification(
    createDto: CreateNotificationDto,
  ): Promise<NotificationDto> {
    // Log để debug
    console.log('📝 Creating notification:', {
      type: createDto.type,
      postId: createDto.postId,
      commentId: createDto.commentId,
      receiverId: createDto.receiverId,
      senderId: createDto.senderId,
    });

    const notification = await this.prisma.notification.create({
      data: {
        receiverId: createDto.receiverId,
        senderId: createDto.senderId,
        type: createDto.type,
        content: createDto.content,
        postId: createDto.postId,
        commentId: createDto.commentId,
      },
      include: {
        User_Notification_senderIdToUser: {
          select: {
            id: true,
            userName: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    const notificationDto: NotificationDto = {
      id: notification.id,
      receiverId: notification.receiverId,
      senderId: notification.senderId,
      type: notification.type,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      postId: notification.postId || undefined,
      commentId: notification.commentId || undefined,
      sender: notification.User_Notification_senderIdToUser
        ? {
            id: notification.User_Notification_senderIdToUser.id,
            userName: notification.User_Notification_senderIdToUser.userName,
            fullName: notification.User_Notification_senderIdToUser.fullName,
            avatar: notification.User_Notification_senderIdToUser.avatar,
          }
        : undefined,
    };

    // Log để debug
    console.log('📝 Created notification DTO:', {
      id: notificationDto.id,
      type: notificationDto.type,
      postId: notificationDto.postId,
      commentId: notificationDto.commentId,
    });

    // Emit notification qua socket (convert Date thành ISO string)
    const notificationForSocket = {
      ...notificationDto,
      createdAt: notification.createdAt.toISOString(),
    };
    this.notificationGateway.emitNotification(
      notification.receiverId,
      notificationForSocket as any,
    );

    // Emit unread count mới (exclude message type)
    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: notification.receiverId,
        isRead: false,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
    });
    this.notificationGateway.emitUnreadCount(
      notification.receiverId,
      unreadCount,
    );

    return notificationDto;
  }

  /**
   * Lấy danh sách notifications của user với pagination
   * Exclude các notification type = 'message' (message notifications không hiển thị trong trang notification)
   */
  async getNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    notifications: NotificationDto[];
    hasMore: boolean;
    total: number;
    unreadCount: number;
  }> {
    // Đếm tổng số notifications (exclude message type)
    const total = await this.prisma.notification.count({
      where: {
        receiverId: userId,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
    });

    // Đếm số notifications chưa đọc (exclude message type)
    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
    });

    // Lấy notifications với pagination (exclude message type)
    const notifications = await this.prisma.notification.findMany({
      where: {
        receiverId: userId,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
      include: {
        User_Notification_senderIdToUser: {
          select: {
            id: true,
            userName: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    const hasMore = offset + limit < total;

    return {
      notifications: notifications.map((notif) => ({
        id: notif.id,
        receiverId: notif.receiverId,
        senderId: notif.senderId,
        type: notif.type,
        content: notif.content,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        postId: notif.postId || undefined,
        commentId: notif.commentId || undefined,
        sender: notif.User_Notification_senderIdToUser
          ? {
              id: notif.User_Notification_senderIdToUser.id,
              userName: notif.User_Notification_senderIdToUser.userName,
              fullName: notif.User_Notification_senderIdToUser.fullName,
              avatar: notif.User_Notification_senderIdToUser.avatar,
            }
          : undefined,
      })),
      hasMore,
      total,
      unreadCount,
    };
  }

  /**
   * Đánh dấu notification là đã đọc
   */
  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<NotificationDto> {
    // Kiểm tra notification có thuộc về user không
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        receiverId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification không tồn tại hoặc không thuộc về bạn');
    }

    // Cập nhật isRead
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        User_Notification_senderIdToUser: {
          select: {
            id: true,
            userName: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    const notificationDto = {
      id: updated.id,
      receiverId: updated.receiverId,
      senderId: updated.senderId,
      type: updated.type,
      content: updated.content,
      isRead: updated.isRead,
      createdAt: updated.createdAt,
      postId: updated.postId || undefined,
      commentId: updated.commentId || undefined,
      sender: updated.User_Notification_senderIdToUser
        ? {
            id: updated.User_Notification_senderIdToUser.id,
            userName: updated.User_Notification_senderIdToUser.userName,
            fullName: updated.User_Notification_senderIdToUser.fullName,
            avatar: updated.User_Notification_senderIdToUser.avatar,
          }
        : undefined,
    };

    // Emit unread count mới (exclude message type)
    const unreadCount = await this.prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
    });
    this.notificationGateway.emitUnreadCount(userId, unreadCount);

    return notificationDto;
  }

  /**
   * Đánh dấu tất cả notifications là đã đọc
   * Exclude message notifications (chỉ đánh dấu các notification khác)
   */
  async markAllAsRead(userId: number): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: {
        receiverId: userId,
        isRead: false,
        type: {
          not: 'message', // Exclude message notifications
        },
      },
      data: {
        isRead: true,
      },
    });

    // Emit unread count = 0 (vì đã đánh dấu tất cả non-message notifications)
    this.notificationGateway.emitUnreadCount(userId, 0);

    return { success: true };
  }

  /**
   * Tạo notification cho tin nhắn mới
   * Chỉ emit qua socket, KHÔNG lưu vào database
   * Notification này chỉ để hiển thị badge ở trang message, không hiển thị trong trang notification
   */
  async createMessageNotification(
    receiverId: number,
    senderId: number,
    senderName: string,
    conversationId: number,
  ): Promise<void> {
    try {
      // Lấy thông tin sender để emit qua socket
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: {
          id: true,
          userName: true,
          fullName: true,
          avatar: true,
        },
      });

      if (!sender) {
        console.error(`Sender ${senderId} not found`);
        return;
      }

      console.log(
        `Emitting message notification: receiverId=${receiverId}, senderId=${senderId}, senderName=${senderName}`,
      );

      // Chỉ emit qua socket, KHÔNG lưu vào database
      this.notificationGateway.emitMessageNotification(
        receiverId,
        senderId,
        senderName,
        conversationId,
      );

      console.log(
        `Message notification emitted successfully for user ${receiverId}`,
      );
    } catch (error) {
      console.error('Error in createMessageNotification:', error);
      throw error;
    }
  }
}
