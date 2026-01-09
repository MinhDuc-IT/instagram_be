import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ReelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findReelsPagination(limit: number, cursor?: string, userId?: number) {
    const posts = await this.prisma.post.findMany({
      where: {
        deleted: false,
        visibility: 'public',
        UploadedAsset: {
          some: {
            type: 'video',
            deleted: false,
          },
        },
      },
      orderBy: { createdDate: 'desc' },
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        User: {
          select: {
            id: true,
            userName: true,
            fullName: true,
            avatar: true,
            Follow_Follow_followingIdToUser: userId
              ? {
                  where: {
                    followerId: userId,
                  },
                  select: {
                    id: true,
                  },
                }
              : false,
          },
        },
        UploadedAsset: {
          where: {
            type: 'video',
            deleted: false,
          },
          select: {
            id: true,
            url: true,
            secureUrl: true,
            width: true,
            height: true,
            duration: true,
            format: true,
            fileSize: true,
          },
          take: 1,
          orderBy: {
            createdDate: 'desc',
          },
        },
        // Comment: {
        //   where: {
        //     parentId: null,
        //   },
        //   orderBy: [
        //     { CommentLike: { _count: 'desc' } },
        //     { createdAt: 'desc' },
        //   ],
        //   take: 3, // Top 3 comments
        //   include: {
        //     User: {
        //       select: {
        //         id: true,
        //         userName: true,
        //         avatar: true,
        //       },
        //     },
        //     CommentLike: {
        //       select: {
        //         id: true,
        //       },
        //     },
        //     other_Comment: {
        //       select: {
        //         id: true,
        //       },
        //     },
        //   },
        // },
        PostLike: userId
          ? {
              where: {
                actorId: userId,
              },
              select: {
                id: true,
              },
            }
          : false,
        postSaves: userId
          ? {
              where: {
                actorId: userId,
              },
              select: {
                id: true,
              },
            }
          : false,
        _count: {
          select: {
            PostLike: true,
            Comment: true,
            postSaves: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    // Transform data để match DTO
    const transformedData = data.map((post) => ({
      id: post.id,
      caption: post.caption ?? undefined,
      location: post.location ?? undefined,
      createdDate: post.createdDate,
      isCommentsDisabled: post.isCommentsDisabled,
      User: {
        id: post.User.id,
        userName: post.User.userName,
        fullName: post.User.fullName ?? undefined,
        avatar: post.User.avatar ?? undefined,
        isFollowing:
          userId && post.User.Follow_Follow_followingIdToUser
            ? post.User.Follow_Follow_followingIdToUser.length > 0
            : undefined,
      },
      video: {
        id: post.UploadedAsset[0].id,
        url: post.UploadedAsset[0].url,
        secureUrl: post.UploadedAsset[0].secureUrl,
        width: post.UploadedAsset[0].width ?? undefined,
        height: post.UploadedAsset[0].height ?? undefined,
        duration: post.UploadedAsset[0].duration ?? undefined,
        format: post.UploadedAsset[0].format,
        fileSize: post.UploadedAsset[0].fileSize,
      },
      likesCount: post._count.PostLike,
      commentsCount: post._count.Comment,
      savesCount: post._count.postSaves,
      // topComments: post.Comment.map((comment) => ({
      //   id: comment.id,
      //   content: comment.content,
      //   createdAt: comment.createdAt,
      //   User: {
      //     id: comment.User.id,
      //     userName: comment.User.userName,
      //     avatar: comment.User.avatar ?? undefined,
      //   },
      //   likesCount: comment.CommentLike.length,
      //   repliesCount: comment.other_Comment.length,
      // })),
      isLiked: userId ? post.PostLike.length > 0 : undefined,
      isSaved: userId ? post.postSaves.length > 0 : undefined,
    }));

    return {
      data: transformedData,
      nextCursor,
      hasMore,
    };
  }
}
