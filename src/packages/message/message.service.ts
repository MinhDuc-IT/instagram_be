import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConversationDto, CreateConversationDto } from './dto/conversation.dto';
import {
  MessageDto,
  SendMessageDto,
  SendMessageToUserDto,
} from './dto/message.dto';
import { MessageGateway } from './message.gateway';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageGateway))
    private readonly messageGateway: MessageGateway,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Tạo hash để đảm bảo không có 2 conversation private giữa cùng 2 user
   * Format: "min(userId1, userId2):max(userId1, userId2)"
   */
  private buildHash(a: number, b: number): string {
    return `${Math.min(a, b)}:${Math.max(a, b)}`;
  }

  /**
   * Lấy danh sách conversations của user hiện tại
   */
  async getConversations(userId: number): Promise<ConversationDto[]> {
    // Lấy tất cả conversations mà user là thành viên
    const conversationMembers = await this.prisma.conversationMember.findMany({
      where: {
        userId,
        leftedAt: null, // Chỉ lấy conversations mà user chưa rời
      },
      include: {
        Conversation: {
          include: {
            ConversationMember: {
              where: {
                userId: { not: userId }, // Lấy thành viên khác (người chat cùng)
              },
              include: {
                User: {
                  select: {
                    id: true,
                    userName: true,
                    fullName: true,
                    avatar: true,
                  },
                },
              },
            },
            Message: {
              take: 1, // Lấy tin nhắn cuối cùng
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    // Đếm số tin nhắn chưa đọc cho mỗi conversation
    const conversationsWithUnread = await Promise.all(
      conversationMembers.map(async (member) => {
        if (!member.Conversation) {
          return null;
        }
        const conversation = member.Conversation;
        const otherMember = conversation.ConversationMember?.[0];

        // Đếm số tin nhắn chưa đọc
        // Lấy tất cả tin nhắn từ người khác
        const totalMessages = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
          },
        });

        // Đếm số tin nhắn đã đọc bởi user hiện tại
        const readMessages = await this.prisma.messageRead.count({
          where: {
            Message: {
              conversationId: conversation.id,
              senderId: { not: userId },
            },
            actorId: userId,
          },
        });

        // Số tin nhắn chưa đọc = tổng - đã đọc
        const actualUnreadCount = totalMessages - readMessages;

        const lastMessage = conversation.Message?.[0];

        return {
          id: conversation.id.toString(),
          participant: otherMember?.User
            ? {
                id: otherMember.User.id.toString(),
                username: otherMember.User.userName,
                fullName: otherMember.User.fullName || undefined,
                avatar: otherMember.User.avatar || undefined,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id.toString(),
                content: lastMessage.content || '',
                senderId: lastMessage.senderId.toString(),
                createdAt: lastMessage.createdAt.toISOString(),
              }
            : undefined,
          unreadCount: actualUnreadCount,
          updatedAt: conversation.updatedAt.toISOString(),
        };
      }),
    );

    // Lọc bỏ các conversation không có participant hoặc null và sắp xếp theo updatedAt
    const filtered = conversationsWithUnread.filter(
      (conv) => conv !== null && conv.participant !== null,
    ) as ConversationDto[];

    // Sắp xếp theo updatedAt giảm dần (mới nhất trước)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Tạo hoặc lấy conversation với một user
   */
  async getOrCreateConversation(
    userId: number,
    createDto: CreateConversationDto,
  ): Promise<ConversationDto> {
    // Parse participantId thành number nếu là string
    const participantId =
      typeof createDto.participantId === 'string'
        ? parseInt(createDto.participantId, 10)
        : createDto.participantId;

    if (isNaN(participantId)) {
      throw new BadRequestException('Invalid participantId');
    }

    if (userId === participantId) {
      throw new BadRequestException(
        'Không thể tạo conversation với chính mình',
      );
    }

    // Kiểm tra user có tồn tại không
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Tạo hash để tìm conversation đã tồn tại
    const hash = this.buildHash(userId, participantId);

    // Tìm conversation đã tồn tại thông qua hash
    const existingConversation = await this.prisma.conversation.findUnique({
      where: {
        hash,
      },
      include: {
        ConversationMember: {
          where: {
            userId: participantId,
          },
          include: {
            User: {
              select: {
                id: true,
                userName: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      const participantMember = existingConversation.ConversationMember?.[0];

      if (participantMember?.User) {
        return {
          id: existingConversation.id.toString(),
          participant: {
            id: participantMember.User.id.toString(),
            username: participantMember.User.userName,
            fullName: participantMember.User.fullName || undefined,
            avatar: participantMember.User.avatar || undefined,
          },
          unreadCount: 0,
          updatedAt: existingConversation.updatedAt.toISOString(),
        };
      }
    }

    // Tạo conversation mới với hash
    try {
      const newConversation = await this.prisma.conversation.create({
        data: {
          type: 'private',
          hash,
          updatedAt: new Date(),
          ConversationMember: {
            create: [{ userId }, { userId: participantId }],
          },
        },
        include: {
          ConversationMember: {
            where: {
              userId: participantId,
            },
            include: {
              User: {
                select: {
                  id: true,
                  userName: true,
                  fullName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      const otherMember = newConversation.ConversationMember?.[0];

      if (!otherMember?.User) {
        throw new BadRequestException('Không thể tạo conversation');
      }

      return {
        id: newConversation.id.toString(),
        participant: {
          id: otherMember.User.id.toString(),
          username: otherMember.User.userName,
          fullName: otherMember.User.fullName || undefined,
          avatar: otherMember.User.avatar || undefined,
        },
        unreadCount: 0,
        updatedAt: newConversation.updatedAt.toISOString(),
      };
    } catch (error: any) {
      // Nếu lỗi do unique constraint violation (race condition)
      // Tìm lại conversation đã được tạo bởi request khác
      const existingConversationRetry =
        await this.prisma.conversation.findUnique({
          where: {
            hash,
          },
          include: {
            ConversationMember: {
              where: {
                userId: participantId,
              },
              include: {
                User: {
                  select: {
                    id: true,
                    userName: true,
                    fullName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        });

      if (existingConversationRetry) {
        const participantMember =
          existingConversationRetry.ConversationMember?.[0];

        if (participantMember?.User) {
          return {
            id: existingConversationRetry.id.toString(),
            participant: {
              id: participantMember.User.id.toString(),
              username: participantMember.User.userName,
              fullName: participantMember.User.fullName || undefined,
              avatar: participantMember.User.avatar || undefined,
            },
            unreadCount: 0,
            updatedAt: existingConversationRetry.updatedAt.toISOString(),
          };
        }
      }

      throw new BadRequestException(
        'Không thể tạo conversation, vui lòng thử lại',
      );
    }
  }

  /**
   * Lấy danh sách tin nhắn trong một conversation với pagination
   */
  async getMessages(
    conversationId: number,
    userId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean; total: number }> {
    // Kiểm tra user có trong conversation không
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        leftedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException(
        'Bạn không có quyền truy cập conversation này',
      );
    }

    // Đếm tổng số tin nhắn
    const total = await this.prisma.message.count({
      where: {
        conversationId,
      },
    });

    // Lấy tin nhắn với pagination (lấy từ mới nhất, sau đó reverse để hiển thị từ cũ đến mới)
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc', // Lấy từ mới nhất
      },
      take: limit,
      skip: offset,
    });

    // Reverse để có thứ tự từ cũ đến mới (cho hiển thị)
    const reversedMessages = messages.reverse();

    const hasMore = offset + limit < total;

    return {
      messages: reversedMessages.map((msg) => ({
        id: msg.id.toString(),
        conversationId: msg.conversationId.toString(),
        senderId: msg.senderId.toString(),
        content: msg.content || '',
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
      })),
      hasMore,
      total,
    };
  }

  /**
   * Gửi tin nhắn đến một user (tự động tạo conversation nếu chưa có)
   */
  async sendMessageToUser(
    userId: number,
    sendDto: SendMessageToUserDto,
  ): Promise<MessageDto> {
    let recipientId: number;
    if (typeof sendDto.recipientId === 'string') {
      recipientId = parseInt(sendDto.recipientId, 10);
    } else {
      recipientId = sendDto.recipientId;
    }

    if (isNaN(recipientId)) {
      throw new BadRequestException('Invalid recipientId');
    }

    if (userId === recipientId) {
      throw new BadRequestException('Không thể gửi tin nhắn cho chính mình');
    }

    // Kiểm tra user có tồn tại không
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Tạo hash để tìm conversation đã tồn tại
    const hash = this.buildHash(userId, recipientId);

    let conversationId: number | null = null;

    // Tìm conversation đã tồn tại thông qua hash
    const existingConversation = await this.prisma.conversation.findUnique({
      where: {
        hash,
      },
    });

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      // Nếu chưa có conversation, tạo mới
      // Unique constraint trên hash sẽ tự động ngăn chặn race condition
      try {
        const newConversation = await this.prisma.conversation.create({
          data: {
            type: 'private',
            hash,
            updatedAt: new Date(),
            ConversationMember: {
              create: [{ userId }, { userId: recipientId }],
            },
          },
        });

        conversationId = newConversation.id;
      } catch (error: any) {
        // Nếu lỗi do unique constraint violation (race condition)
        // Tìm lại conversation đã được tạo bởi request khác
        const existingConversationRetry =
          await this.prisma.conversation.findUnique({
            where: {
              hash,
            },
          });

        if (existingConversationRetry) {
          conversationId = existingConversationRetry.id;
        } else {
          // Nếu vẫn không tìm thấy, throw error
          throw new BadRequestException(
            'Không thể tạo conversation, vui lòng thử lại',
          );
        }
      }
    }

    // Gửi tin nhắn trong conversation
    return this.sendMessage(conversationId, userId, {
      content: sendDto.content,
    });
  }

  /**
   * Gửi tin nhắn
   */
  async sendMessage(
    conversationId: number,
    userId: number,
    sendDto: SendMessageDto,
  ): Promise<MessageDto> {
    // Kiểm tra user có trong conversation không
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        leftedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException(
        'Bạn không có quyền gửi tin nhắn trong conversation này',
      );
    }

    // Tạo tin nhắn
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: sendDto.content,
        messageType: 'text',
        updatedAt: new Date(),
      },
    });

    // Cập nhật updatedAt của conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const messageDto: MessageDto = {
      id: message.id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      content: message.content || '',
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };

    // Lấy danh sách tất cả thành viên conversation (bao gồm cả người gửi)
    const allConversationMembers =
      await this.prisma.conversationMember.findMany({
        where: {
          conversationId,
          leftedAt: null,
        },
        select: {
          userId: true,
        },
      });

    // Lấy danh sách userIds để emit đến tất cả users
    const userIds = allConversationMembers.map((member) => member.userId);

    // Emit new message đến tất cả users trong conversation (qua cả conversation room và user rooms)
    this.messageGateway.emitNewMessageToAllUsers(
      conversationId,
      messageDto,
      userIds,
    );

    // Tạo notification cho người nhận (nếu không phải người gửi)
    // Lấy danh sách thành viên conversation để tìm người nhận
    const conversationMembers = await this.prisma.conversationMember.findMany({
      where: {
        conversationId,
        userId: { not: userId }, // Lấy các thành viên khác (người nhận)
        leftedAt: null,
      },
      include: {
        User: {
          select: {
            id: true,
            userName: true,
            fullName: true,
          },
        },
      },
    });

    // Lấy thông tin người gửi
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userName: true,
        fullName: true,
      },
    });

    // Tạo notification cho mỗi người nhận
    if (sender) {
      const senderName = sender.fullName || sender.userName;
      for (const member of conversationMembers) {
        if (member.User) {
          // Tạo notification (async, không cần đợi)
          this.notificationService
            .createMessageNotification(
              member.User.id,
              sender.id,
              senderName,
              conversationId,
            )
            .catch((error) => {
              console.error('Error creating message notification:', error);
            });
        }
      }
    }

    return messageDto;
  }

  /**
   * Đánh dấu tất cả tin nhắn trong conversation là đã đọc
   */
  async markMessagesAsRead(
    conversationId: number,
    userId: number,
  ): Promise<{ success: boolean; readCount: number }> {
    // Kiểm tra user có trong conversation không
    const member = await this.prisma.conversationMember.findFirst({
      where: {
        conversationId,
        userId,
        leftedAt: null,
      },
    });

    if (!member) {
      throw new NotFoundException(
        'Bạn không có quyền truy cập conversation này',
      );
    }

    // Lấy tất cả tin nhắn chưa đọc từ người khác
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId }, // Tin nhắn từ người khác
        MessageRead: {
          none: {
            actorId: userId, // Chưa được đọc bởi user này
          },
        },
      },
      select: {
        id: true,
      },
    });

    // Đánh dấu tất cả tin nhắn là đã đọc
    if (unreadMessages.length > 0) {
      await this.prisma.messageRead.createMany({
        data: unreadMessages.map((msg) => ({
          messageId: msg.id,
          actorId: userId,
        })),
        skipDuplicates: true, // Bỏ qua nếu đã tồn tại
      });
    }

    const readCount = unreadMessages.length;

    // Emit message read event via socket
    if (readCount > 0) {
      this.messageGateway.emitMessageRead(conversationId, userId, readCount);
    }

    return {
      success: true,
      readCount,
    };
  }
}
