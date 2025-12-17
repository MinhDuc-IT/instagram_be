import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCommentRequest, CommentDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (dto.text.length > 1000) {
      throw new BadRequestException(
        'Comment text cannot exceed 1000 characters',
      );
    }

    // Validate replyTo if provided
    let parentId: number | null = null;
    if (dto.replyToCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parseInt(dto.replyToCommentId, 10) },
      });
      if (!parentComment) {
        throw new BadRequestException('Reply-to comment not found');
      }
      parentId = parentComment.id;
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        postId,
        content: dto.text,
        rootId: 1, // temporary, will update below
        parentId,
        updatedAt: new Date(),
      },
      include: {
        User: { select: { id: true, userName: true, avatar: true } },
      },
    });

    return this.mapCommentToDto(comment);
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
        other_Comment: {
          take: 3, // Lấy 3 replies đầu tiên
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
              // parent comment
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
                other_Comment: true,
              },
            },
          },
        },
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

    return {
      comments: data.map((comment) => ({
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
        repliesCount: comment._count.other_Comment,
        isLiked: userId ? (comment.CommentLike as any[]).length > 0 : undefined,
        replies: comment.other_Comment.map((reply) => ({
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
          rootCommentId: comment.id,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
          likesCount: reply._count.CommentLike,
          repliesCount: reply._count.other_Comment,
          isLiked: userId ? (reply.CommentLike as any[]).length > 0 : undefined,
        })),
      })),
      nextCursor,
      hasMore,
      total,
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
    if (text.length > 1000) {
      throw new BadRequestException(
        'Comment text cannot exceed 1000 characters',
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

    return this.mapCommentToDto(updated);
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

    // parse cursor
    let cursorCondition = {};
    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      cursorCondition = {
        OR: [
          { createdAt: { gt: new Date(createdAt) } },
          {
            createdAt: new Date(createdAt),
            id: { gt: Number(id) },
          },
        ],
      };
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        rootId: rootCommentId,
        ...cursorCondition,
      },
      take: limit + 1,
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

    const nextCursor = hasMore
      ? `${data[data.length - 1].createdAt.toISOString()}_${data[data.length - 1].id}`
      : null;

    return {
      comments: data.map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        username: c.User.userName,
        userAvatar: c.User.avatar ?? undefined,
        text: c.content,
        parentId: c.parentId,
        rootCommentId: c.rootId,
        replyToUser: c.Comment
          ? {
              id: c.Comment.User.id,
              userName: c.Comment.User.userName,
              avatar: c.Comment.User.avatar ?? undefined,
            }
          : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        likesCount: c._count.CommentLike,
        isLiked: userId ? c.CommentLike.length > 0 : undefined,
      })),
      hasMore,
      nextCursor,
    };
  }

  private mapCommentToDto(comment: any) {
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      username: comment.User?.userName || '',
      userAvatar: comment.User?.avatar || '',
      text: comment.content,
      replyTo: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
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
