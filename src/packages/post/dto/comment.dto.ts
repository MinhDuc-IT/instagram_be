import { Expose, Type } from 'class-transformer';

export class CreateCommentRequest {
    text: string;
    replyToCommentId?: string;
}

export class CommentDto {
    @Expose()
    id: number;

    @Expose()
    postId: string;

    @Expose()
    userId: number;

    @Expose()
    username: string;

    @Expose()
    userAvatar?: string;

    @Expose()
    text: string;

    @Expose()
    replyTo?: number | null;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}

export class GetCommentsResponse {
    @Expose()
    @Type(() => CommentDto)
    comments: CommentDto[];

    @Expose()
    meta: {
        page?: number;
        limit?: number;
        total?: number;
        cursor?: string;
    };
}
