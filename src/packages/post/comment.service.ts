import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCommentRequest, CommentDto } from './dto/comment.dto';
import { MessageGateway } from '../message/message.gateway';
import { Const } from '../../common/Constants';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageGateway))
    private readonly messageGateway: MessageGateway,
    private readonly notificationService: NotificationService,
  ) { }

  async createComment(
    postId: string,
    userId: number,
    dto: CreateCommentRequest,
  ) {
    // Validate post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Validate text
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Comment text is required');
    }
    if (dto.text.length > Const.MAX_COMMENT_LENGTH) {
      throw new BadRequestException(
        `Comment text cannot exceed ${Const.MAX_COMMENT_LENGTH} characters`,
      );
    }

    // Check if comments are disabled
    if (post.isCommentsDisabled) {
      throw new BadRequestException('Comments are disabled for this post');
    }

    // Validate replyTo if provided and derive rootId when replying
    let parentId: number | null = null;
    let rootCommentId: number | null = null;
    let replyToUser: any = null;

    if (dto.replyToCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parseInt(dto.replyToCommentId, 10) },
        select: {
          id: true,
          rootId: true,
          User: { select: { id: true, userName: true, avatar: true } },
        },
      });
      if (!parentComment) {
        throw new BadRequestException('Reply-to comment not found');
      }
      parentId = parentComment.id;
      rootCommentId = parentComment.rootId;
      replyToUser = parentComment.User;
    }

    // If FE provides explicit rootCommentId, validate and use it
    if (!rootCommentId && dto.rootCommentId) {
      const root = await this.prisma.comment.findUnique({
        where: { id: parseInt(dto.rootCommentId, 10) },
        select: { id: true },
      });
      if (!root) {
        throw new BadRequestException('Root comment not found');
      }
      rootCommentId = root.id;
    }

    // Create comment. If it's a root comment (no rootId yet), set rootId to its own id in a transaction
    let createdComment: any;
    if (rootCommentId && rootCommentId > 0) {
      createdComment = await this.prisma.comment.create({
        data: {
          userId,
          postId,
          content: dto.text,
          rootId: rootCommentId,
          parentId,
          updatedAt: new Date(),
        },
        include: {
          User: { select: { id: true, userName: true, avatar: true } },
        },
      });
    } else {
      // Root comment: create then update rootId = new id
      createdComment = await this.prisma.$transaction(async (tx) => {
        const c = await tx.comment.create({
          data: {
            userId,
            postId,
            content: dto.text,
            rootId: 0, // placeholder, will be updated to self id
            parentId: null,
            updatedAt: new Date(),
          },
        });
        const updated = await tx.comment.update({
          where: { id: c.id },
          data: { rootId: c.id },
          include: {
            User: { select: { id: true, userName: true, avatar: true } },
          },
        });
        return updated;
      });
    }

    const commentDto = this.mapCommentToDto(
      createdComment,
      rootCommentId ?? createdComment.rootId ?? createdComment.id,
      replyToUser,
    );

    this.messageGateway.handleNewCommentBroadcast(postId, commentDto, userId);

    // Tạo notification
    try {
      // Lấy thông tin user đang comment
      const commenter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, userName: true, fullName: true },
      });

      if (commenter) {
        const senderName = commenter.fullName || commenter.userName;

        if (parentId && replyToUser) {
          // Nếu là reply comment, tạo notification cho người được reply
          // Chỉ tạo notification nếu không phải reply chính mình
          if (replyToUser.id !== userId) {
            await this.notificationService.createNotification({
              receiverId: replyToUser.id,
              senderId: userId,
              type: 'comment',
              content: `${senderName} đã trả lời bình luận của bạn`,
              postId: postId,
              commentId: createdComment.id,
            });
          }
        } else {
          // Nếu là comment mới, tạo notification cho chủ post
          // Chỉ tạo notification nếu không phải comment chính post của mình
          if (post.userId !== userId) {
            await this.notificationService.createNotification({
              receiverId: post.userId,
              senderId: userId,
              type: 'comment',
              content: `${senderName} đã bình luận bài viết của bạn`,
              postId: postId,
              commentId: createdComment.id,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error creating comment notification: ${error.message}`,
      );
      // Không throw error để không ảnh hưởng đến flow chính
    }

    return commentDto;
  }

  async getComments(
    postId: string,
    limit: number = 20,
    cursor?: string,
    userId?: number,
  ) {
    // Validate post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Get total count
    const total = await this.prisma.comment.count({
      where: { postId, parentId: null },
    });

    // Fetch comments with cursor-based pagination
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null, // Chỉ lấy comment gốc (không phải reply)
      },
      take: limit + 1, // Lấy thêm 1 để check hasMore
      ...(cursor && {
        skip: 1,
        cursor: { id: parseInt(cursor, 10) },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            userName: true,
            avatar: true,
          },
        },
        CommentLike: userId
          ? {
            where: { actorId: userId },
            select: { id: true },
          }
          : false,
        // other_Comment: {
        //   take: 3, // Lấy 3 replies đầu tiên
        //   orderBy: { createdAt: 'asc' },
        //   include: {
        //     User: {
        //       select: {
        //         id: true,
        //         userName: true,
        //         avatar: true,
        //       },
        //     },
        //     Comment: {
        //       // parent comment
        //       select: {
        //         id: true,
        //         User: {
        //           select: {
        //             id: true,
        //             userName: true,
        //             avatar: true,
        //           },
        //         },
        //       },
        //     },
        //     CommentLike: userId
        //       ? {
        //           where: { actorId: userId },
        //           select: { id: true },
        //         }
        //       : false,
        //     _count: {
        //       select: {
        //         CommentLike: true,
        //         other_Comment: true,
        //       },
        //     },
        //   },
        // },
        _count: {
          select: {
            CommentLike: true,
            other_Comment: true,
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? data[data.length - 1].id.toString() : null;

    // Đếm tất cả replies (nested) của mỗi comment theo rootId
    const commentDtos = await Promise.all(
      data.map(async (comment) => {
        const repliesCount = await this.prisma.comment.count({
          where: {
            postId,
            rootId: comment.id,
            id: { not: comment.id }, // Không tính chính comment đó
          },
        });

        return {
          id: comment.id,
          postId: comment.postId,
          userId: comment.userId,
          username: comment.User.userName,
          userAvatar: comment.User.avatar ?? undefined,
          text: comment.content,
          replyTo: comment.parentId,
          replyToCommentId: comment.parentId,
          replyToUser: null,
          rootCommentId: comment.id,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          likesCount: comment._count.CommentLike,
          repliesCount, // Tất cả nested replies
          isLiked: userId
            ? (comment.CommentLike as any[]).length > 0
            : undefined,
        };
      }),
    );

    // Sắp xếp: comments của tác giả bài viết ở trên (chỉ root comments, không phải replies)
    commentDtos.sort((a, b) => {
      const aIsAuthorAndRoot =
        a.userId === post.userId && a.replyTo === null ? 0 : 1;
      const bIsAuthorAndRoot =
        b.userId === post.userId && b.replyTo === null ? 0 : 1;
      return aIsAuthorAndRoot - bIsAuthorAndRoot;
    });

    return {
      comments: commentDtos,
      nextCursor,
      hasMore,
      total,
    };
  }

  async toggleCommentLike(postId: string, commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, userId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    // Dùng deleteMany + create để tránh race condition với unique constraint
    const deleted = await this.prisma.commentLike.deleteMany({
      where: { actorId: userId, commentId },
    });

    let isLiked = false;

    // Nếu xóa được (đã có like) thì isLiked = false
    // Nếu không xóa được gì (chưa có like) thì tạo mới
    if (deleted.count === 0) {
      try {
        await this.prisma.commentLike.create({
          data: { actorId: userId, commentId },
        });
        isLiked = true;

        // Tạo notification cho chủ comment (chỉ khi like, không phải unlike)
        // Không tạo notification nếu user like chính comment của mình
        if (comment.userId !== userId) {
          try {
            // Lấy thông tin user đang like
            const liker = await this.prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, userName: true, fullName: true },
            });

            if (liker) {
              const senderName = liker.fullName || liker.userName;
              await this.notificationService.createNotification({
                receiverId: comment.userId,
                senderId: userId,
                type: 'comment_like',
                content: `${senderName} đã thích bình luận của bạn`,
                postId: comment.postId,
                commentId: commentId,
              });
            }
          } catch (error) {
            this.logger.error(
              `Error creating comment like notification: ${error.message}`,
            );
            // Không throw error để không ảnh hưởng đến flow chính
          }
        }
      } catch (error) {
        // Nếu duplicate do race condition, coi như đã like rồi
        if (error.code === 'P2002') {
          isLiked = true;
        } else {
          throw error;
        }
      }
    }

    const likesCount = await this.prisma.commentLike.count({
      where: { commentId },
    });

    return {
      commentId,
      postId: comment.postId,
      userId,
      isLiked,
      likesCount,
    };
  }

  async updateComment(
    postId: string,
    commentId: number,
    userId: number,
    text: string,
  ) {
    // Validate text
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Comment text is required');
    }
    if (text.length > Const.MAX_COMMENT_LENGTH) {
      throw new BadRequestException(
        `Comment text cannot exceed ${Const.MAX_COMMENT_LENGTH} characters`,
      );
    }

    // Check comment ownership
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { User: { select: { id: true, userName: true, avatar: true } } },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Only comment owner can edit');
    }

    if (comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: text, updatedAt: new Date() },
      include: { User: { select: { id: true, userName: true, avatar: true } } },
    });

    return this.mapCommentToDto(updated, updated.rootId ?? updated.id, null);
  }

  async deleteComment(postId: string, commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Only comment owner can delete');
    }

    if (comment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    // Delete replies first
    await this.prisma.comment.deleteMany({
      where: { parentId: commentId },
    });

    await this.prisma.comment.delete({ where: { id: commentId } });

    return { success: true, message: 'Comment deleted' };
  }

  async getReplies(
    postId: string,
    commentId: number,
    limit: number = 20,
    cursor?: string,
    userId?: number,
  ) {
    // Validate parent comment exists
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new NotFoundException('Parent comment not found');
    }

    if (parentComment.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    // Get total count
    const total = await this.prisma.comment.count({
      where: { parentId: commentId },
    });

    // Fetch replies with cursor-based pagination
    const replies = await this.prisma.comment.findMany({
      where: {
        parentId: commentId,
      },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: parseInt(cursor, 10) },
      }),
      orderBy: { createdAt: 'asc' },
      include: {
        User: {
          select: {
            id: true,
            userName: true,
            avatar: true,
          },
        },
        Comment: {
          select: {
            id: true,
            User: {
              select: {
                id: true,
                userName: true,
                avatar: true,
              },
            },
          },
        },
        CommentLike: userId
          ? {
            where: { actorId: userId },
            select: { id: true },
          }
          : false,
        _count: {
          select: {
            CommentLike: true,
          },
        },
      },
    });

    const hasMore = replies.length > limit;
    const data = hasMore ? replies.slice(0, limit) : replies;
    const nextCursor = hasMore ? data[data.length - 1].id.toString() : null;

    const rootCommentId = parentComment.parentId ?? parentComment.id;

    return {
      comments: data.map((reply) => ({
        id: reply.id,
        postId: reply.postId,
        userId: reply.userId,
        username: reply.User.userName,
        userAvatar: reply.User.avatar ?? undefined,
        text: reply.content,
        replyTo: reply.parentId,
        replyToCommentId: reply.parentId,
        replyToUser: reply.Comment
          ? {
            id: reply.Comment.User.id,
            userName: reply.Comment.User.userName,
            avatar: reply.Comment.User.avatar ?? undefined,
          }
          : null,
        rootCommentId,
        createdAt: reply.createdAt.toISOString(),
        updatedAt: reply.updatedAt.toISOString(),
        likesCount: reply._count.CommentLike,
        repliesCount: 0, // Replies không có nested replies
        isLiked: userId ? (reply.CommentLike as any[]).length > 0 : undefined,
      })),
      nextCursor,
      hasMore,
      total,
    };
  }

  async getCommentThreadPaginated(
    postId: string,
    rootCommentId: number,
    limit = 10,
    cursor?: string,
    userId?: number,
  ) {
    // validate root comment
    const root = await this.prisma.comment.findUnique({
      where: { id: rootCommentId },
    });

    if (!root || root.postId !== postId) {
      throw new NotFoundException('Comment not found');
    }

    // total comments in this thread
    const total = await this.prisma.comment.count({
      where: { postId, rootId: rootCommentId, id: { not: rootCommentId } },
    });

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        rootId: rootCommentId,
        id: { not: rootCommentId },
      },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: parseInt(cursor, 10) },
      }),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        User: {
          select: { id: true, userName: true, avatar: true },
        },
        Comment: {
          select: {
            id: true,
            User: {
              select: { id: true, userName: true, avatar: true },
            },
          },
        },
        CommentLike: userId
          ? { where: { actorId: userId }, select: { id: true } }
          : false,
        _count: {
          select: { CommentLike: true },
        },
      },
    });

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;

    const nextCursor = hasMore ? data[data.length - 1].id.toString() : null;

    return {
      comments: data.map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        username: c.User.userName,
        userAvatar: c.User.avatar ?? undefined,
        text: c.content,
        replyTo: c.parentId,
        replyToCommentId: c.parentId,
        replyToUser: c.Comment
          ? {
            id: c.Comment.User.id,
            userName: c.Comment.User.userName,
            avatar: c.Comment.User.avatar ?? undefined,
          }
          : null,
        rootCommentId: c.rootId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        likesCount: c._count.CommentLike,
        repliesCount: 0,
        isLiked: userId ? (c.CommentLike as any[]).length > 0 : undefined,
      })),
      nextCursor,
      hasMore,
      total,
    };
  }

  private mapCommentToDto(
    comment: any,
    rootCommentId?: number,
    replyToUser?: any,
  ) {
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      username: comment.User?.userName || '',
      userAvatar: comment.User?.avatar || '',
      text: comment.content,
      replyTo: comment.parentId,
      replyToCommentId: comment.parentId,
      replyToUser: replyToUser
        ? {
          id: replyToUser.id,
          userName: replyToUser.userName,
          avatar: replyToUser.avatar ?? undefined,
        }
        : null,
      rootCommentId: rootCommentId ?? comment.rootId ?? comment.id,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likesCount: comment._count?.CommentLike ?? 0,
      repliesCount: comment._count?.other_Comment ?? 0,
      isLiked: undefined,
    };
  }

  /**
   * Lấy toàn bộ cây reply của một comment gốc (hoặc tự động tìm comment gốc của comment được truyền vào)
   * Trả về danh sách phẳng kèm parent để FE tự dựng cây, sắp xếp theo thời gian tạo (asc)
   */
  async getCommentThread(postId: string, commentId: number, userId?: number) {
    // Lấy comment hiện tại
    let root = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        User: { select: { id: true, userName: true, avatar: true } },
        CommentLike: userId
          ? { where: { actorId: userId }, select: { id: true } }
          : false,
        _count: { select: { CommentLike: true, other_Comment: true } },
        Comment: {
          select: {
            id: true,
            User: {
              select: { id: true, userName: true, avatar: true },
            },
            parentId: true,
            postId: true,
          },
        },
      },
    });

    if (!root) {
      throw new NotFoundException('Comment not found');
    }

    // Tìm tới comment gốc (parentId null)
    let currentParentId = root.parentId;
    while (currentParentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: currentParentId },
        select: {
          id: true,
          parentId: true,
          postId: true,
          User: { select: { id: true, userName: true, avatar: true } },
        },
      });

      if (!parent) break;

      root = {
        ...root,
        id: parent.id,
        parentId: parent.parentId,
        postId: parent.postId,
        User: parent.User,
      } as any;

      currentParentId = parent.parentId;
    }

    if (root!.postId !== postId) {
      throw new BadRequestException('Comment does not belong to this post');
    }

    const rootId = root!.id;

    // Hàm map comment entity -> DTO phẳng
    const mapEntity = (c: any, parentUser?: any): any => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      username: c.User?.userName || '',
      userAvatar: c.User?.avatar ?? undefined,
      text: c.content,
      replyTo: c.parentId,
      replyToCommentId: c.parentId,
      replyToUser: parentUser
        ? {
          id: parentUser.id,
          userName: parentUser.userName,
          avatar: parentUser.avatar ?? undefined,
        }
        : null,
      rootCommentId: rootId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      likesCount: c._count?.CommentLike ?? 0,
      repliesCount: c._count?.other_Comment ?? 0,
      isLiked: userId ? (c.CommentLike as any[])?.length > 0 : undefined,
    });

    const results: any[] = [];

    // Push root comment
    results.push(mapEntity(root!, root!.Comment?.User));

    // BFS lấy tất cả descendants
    let queueIds = [rootId];

    while (queueIds.length > 0) {
      const children = await this.prisma.comment.findMany({
        where: {
          postId,
          parentId: { in: queueIds },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          User: { select: { id: true, userName: true, avatar: true } },
          Comment: {
            select: {
              id: true,
              User: { select: { id: true, userName: true, avatar: true } },
            },
          },
          CommentLike: userId
            ? { where: { actorId: userId }, select: { id: true } }
            : false,
          _count: { select: { CommentLike: true, other_Comment: true } },
        },
      });

      if (children.length === 0) break;

      // Map và push
      for (const child of children) {
        results.push(mapEntity(child, child.Comment?.User));
      }

      // Chuẩn bị cho vòng tiếp theo
      queueIds = children.map((c) => c.id);
    }

    // Sắp xếp theo thời gian tạo để hiển thị theo dòng thời gian
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      comments: results,
      total: results.length,
      hasMore: false,
      nextCursor: null,
    };
  }
}
