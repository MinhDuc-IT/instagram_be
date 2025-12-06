import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCommentRequest, CommentDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
    constructor(private readonly prisma: PrismaService) { }

    async createComment(postId: string, userId: number, dto: CreateCommentRequest) {
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
            throw new BadRequestException('Comment text cannot exceed 1000 characters');
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
                parentId,
                updatedAt: new Date(),
            },
            include: {
                User: { select: { id: true, userName: true, avatar: true } },
            },
        });

        return this.mapCommentToDto(comment);
    }

    async getComments(postId: string, page: number = 1, limit: number = 20) {
        // Validate post exists
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            this.prisma.comment.findMany({
                where: { postId, parentId: null }, // Only root comments, replies are nested
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    User: { select: { id: true, userName: true, avatar: true } },
                },
            }),
            this.prisma.comment.count({ where: { postId, parentId: null } }),
        ]);

        return {
            comments: comments.map(c => this.mapCommentToDto(c)),
            meta: {
                page,
                limit,
                total,
            },
        };
    }

    async updateComment(postId: string, commentId: number, userId: number, text: string) {
        // Validate text
        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Comment text is required');
        }
        if (text.length > 1000) {
            throw new BadRequestException('Comment text cannot exceed 1000 characters');
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
}
