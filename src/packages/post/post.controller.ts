import {
    Controller,
    Post,
    Body,
    UseInterceptors,
    UploadedFiles,
    Req,
    HttpCode,
    HttpStatus,
    Get,
    Param,
    NotFoundException,
    ParseIntPipe,
    BadRequestException,
    Patch,
    Delete,
    Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CreatePostDto } from './dto/create-post.dto';
import { PostService } from './post.service';
import { CommentService } from './comment.service';
import { FileValidationPipe } from '../../core/upload/pipes/file-validation.pipe';
import { MultiFileValidationPipe } from '../../core/upload/pipes/multi-file-validation.pipe';
import { UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { JobStatusResponseDto } from '../../core/upload/dto/background-job.dto';
import { Public } from 'src/core/decorators/response.decorator';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { TransformResponseDto, ResponseMessage } from 'src/core/decorators/response.decorator';
import { PostDto } from './dto/get-post.dto';
import { PostLikeToggleResponse, PostSaveToggleResponse } from './dto/post-interaction.dto';
import { CommentDto, CommentLikeToggleResponse, CreateCommentRequest, GetCommentsResponse } from './dto/comment.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { GetHomeFeedDto } from './dto/get-home-feed.dto';
import { OptionalJwtAuthGuard } from 'src/core/guards/optional-jwt-auth.guard';

@ApiTags('Post')
@Controller('post')
// @UseGuards(JwtAuthGuard)
export class PostController {
    constructor(
        private readonly postService: PostService,
        private readonly commentService: CommentService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get('home')
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getHome(
        @Req() req,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        const userId = req.user?.id ?? null;
        return this.postService.getHomeFeed(userId, +page, +limit);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Tạo bài viết với nhiều ảnh/video',
        type: CreatePostDto,
    })
    @ApiOperation({ summary: 'Tạo bài viết (upload trực tiếp)' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Bài viết được tạo thành công' })
    async create(@Body() body: CreatePostDto, @UploadedFiles(
        new MultiFileValidationPipe(
            new FileValidationPipe({
                maxSize: UPLOAD_CONSTANTS.MAX_VIDEO_SIZE,
                allowedTypes: [
                    ...UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES,
                    ...UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES,
                ],
                fileType: 'mixed',
            }),
        ),
    ) files: Express.Multer.File[]
        ,
        @Req() req: any
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');
        return this.postService.createPost(body, files, userId);
    }

    @Post('background')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Tạo bài viết với ảnh/video (xử lý nền)',
        type: CreatePostDto,
    })
    @ApiOperation({ summary: 'Tạo bài viết trong background (async)' })
    @ApiResponse({ status: HttpStatus.ACCEPTED, type: JobStatusResponseDto })
    async createBackground(
        @Body() body: CreatePostDto,
        @UploadedFiles(
            new MultiFileValidationPipe(
                new FileValidationPipe({
                    maxSize: UPLOAD_CONSTANTS.MAX_VIDEO_SIZE,
                    allowedTypes: [
                        ...UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES,
                        ...UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES,
                    ],
                    fileType: 'mixed',
                }),
            ),
        )
        files: Express.Multer.File[],
        @Req() req: any,
    ): Promise<JobStatusResponseDto> {
        const userId = req.user?.id;
        if (!userId) {
            console.warn('createBackground: req.user is missing');
            throw new BadRequestException('User not found in token');
        }

        return this.postService.createPostBackground(body, files, userId);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy thông tin bài viết' })
    async getPost(@Param('id') id: string, @Req() req: any) {
        const currentUserId = req.user?.id;
        const post = await this.postService.getPostById(id, currentUserId);
        if (!post) throw new NotFoundException('Post not found');
        return post;
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Chỉnh sửa thông tin bài viết' })
    async editPost(
        @Param('id') id: string,
        @Body() dto: EditPostDto,
        @Req() req: any
    ) {
        const currentUserId = req.user?.id;

        return this.postService.editPost(id, currentUserId, dto);
    }

    @Get('user/:userId')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy danh sách bài viết của user' })
    @TransformResponseDto(PostDto)
    async getPosts(@Param('userId') userId: number, @Req() req: any) {
        const currentUserId = req.user?.id;
        const posts = await this.postService.getPosts(userId, currentUserId);
        if (!posts) throw new NotFoundException('Posts not found');
        return posts;
    }

    @Get('user/:userId/saved')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy các bài viết user đã lưu' })
    @TransformResponseDto(PostDto)
    async getSavedPosts(@Param('userId') userId: number, @Req() req: any) {
        const currentUserId = req.user?.id;
        // Kiểm tra quyền? Thường chỉ xem được saved posts của chính mình
        // if (currentUserId !== Number(userId)) throw new ForbiddenException();
        // Nhưng tạm thời để open hoặc FE handle logic này
        const posts = await this.postService.getSavedPosts(userId, currentUserId);
        return posts;
    }

    @Get('user/:userId/reels')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Lấy danh sách Reels (Video posts) của user' })
    @TransformResponseDto(PostDto)
    async getReels(@Param('userId') userId: number, @Req() req: any) {
        const currentUserId = req.user?.id;
        const posts = await this.postService.getUserReels(userId, currentUserId);
        return posts;
    }

    @Post(':postId/like')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle like trên bài viết' })
    @ApiResponse({ status: 200, description: 'Like toggled successfully' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(PostLikeToggleResponse)
    @ResponseMessage('Toggled like')
    async toggleLike(@Param('postId') postId: string, @Req() req: any) {
        try {
            const userId = req.user?.id;
            if (!userId) throw new BadRequestException('User not found in token');
            return await this.postService.toggleLike(postId, userId);
        } catch (error) {
            if (error.message === 'Post not found') {
                throw new NotFoundException('Post not found');
            }
            throw error;
        }
    }

    @Post(':postId/save')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle save/bookmark trên bài viết' })
    @ApiResponse({ status: 200, description: 'Save toggled successfully' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(PostSaveToggleResponse)
    @ResponseMessage('Toggled save')
    async toggleSave(@Param('postId') postId: string, @Req() req: any) {
        try {
            const userId = req.user?.id;
            if (!userId) throw new BadRequestException('User not found in token');
            return await this.postService.toggleSave(postId, userId);
        } catch (error) {
            if (error.message === 'Post not found') {
                throw new NotFoundException('Post not found');
            }
            throw error;
        }
    }

    @Post(':postId/comments')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Tạo comment trên bài viết' })
    @ApiResponse({ status: 201, description: 'Comment created' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(CommentDto)
    @ResponseMessage('Comment created')
    async createComment(
        @Param('postId') postId: string,
        @Body() dto: CreateCommentRequest,
        @Req() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');
        return await this.commentService.createComment(postId, userId, dto);
    }

    @Get(':postId/comments')
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    // @Public()
    @ApiOperation({
        summary: 'Lấy danh sách comment của bài viết (với cursor-based pagination)',
        description: 'Lấy comments có thể load thêm bằng cursor. Trả về cả replies (3 replies đầu tiên của mỗi comment)'
    })

    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số comment trả về mỗi trang (mặc định 20)' })
    @ApiQuery({ name: 'cursor', required: false, type: String, description: 'ID comment cuối cùng của trang trước' })
    @ApiResponse({
        status: 200,
        description: 'Comments retrieved successfully',
        type: GetCommentsResponse,
    })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @TransformResponseDto(GetCommentsResponse)
    @ResponseMessage('Comments retrieved')
    async getComments(
        @Param('postId') postId: string,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        const parsedLimit = limit ? parseInt(limit, 10) : 20;

        if (isNaN(parsedLimit) || parsedLimit <= 0) {
            throw new BadRequestException('Invalid limit value');
        }

        return await this.commentService.getComments(
            postId,
            parsedLimit,
            cursor,
            userId,
        );
    }

    @Post(':postId/comments/:commentId/like')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle like trên comment' })
    @ApiResponse({ status: 200, description: 'Comment like toggled', type: CommentLikeToggleResponse })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 400, description: 'Comment does not belong to this post' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(CommentLikeToggleResponse)
    @ResponseMessage('Comment like toggled')
    async toggleCommentLike(
        @Param('postId') postId: string,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Req() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');
        return await this.commentService.toggleCommentLike(postId, commentId, userId);
    }

    @Patch(':postId/comments/:commentId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Sửa comment' })
    @ApiResponse({ status: 200, description: 'Comment updated' })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(CommentDto)
    @ResponseMessage('Comment updated')
    async updateComment(
        @Param('postId') postId: string,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Body() body: { text: string },
        @Req() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');
        return await this.commentService.updateComment(postId, commentId, userId, body.text);
    }

    @Delete(':postId/comments/:commentId')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa comment' })
    @ApiResponse({ status: 200, description: 'Comment deleted' })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ResponseMessage('Comment deleted')
    async deleteComment(
        @Param('postId') postId: string,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Req() req: any,
    ) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');
        return await this.commentService.deleteComment(postId, commentId, userId);
    }

    @Get(':postId/comments/:commentId/thread')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Lấy toàn bộ cây replies của một comment gốc',
        description: 'Trả về danh sách phẳng các comment trong thread, có parentId và replyToUser để FE dựng cây như Instagram',
    })
    @ApiResponse({ status: 200, description: 'Comment thread retrieved', type: GetCommentsResponse })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @TransformResponseDto(GetCommentsResponse)
    @ResponseMessage('Comment thread retrieved')
    async getCommentThread(
        @Param('postId') postId: string,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        return this.commentService.getCommentThread(postId, commentId, userId);
    }

    @Get(':postId/comments/:commentId/replies')
    @UseGuards(OptionalJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Lấy replies của một comment (với cursor-based pagination)',
        description: 'Load thêm replies khi user click "View more replies"'
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số comment trả về mỗi trang (mặc định 20)' })
    @ApiQuery({ name: 'cursor', required: false, type: String, description: 'ID comment cuối cùng của trang trước' })
    @ApiResponse({
        status: 200,
        description: 'Replies retrieved successfully',
        type: GetCommentsResponse,
    })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @TransformResponseDto(GetCommentsResponse)
    @ResponseMessage('Replies retrieved')
    async getReplies(
        @Param('postId') postId: string,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
        @Req() req?: any,
    ) {
        const userId = req?.user?.id;
        const parsedLimit = limit ? parseInt(limit, 10) : 20;

        if (isNaN(parsedLimit) || parsedLimit <= 0) {
            throw new BadRequestException('Invalid limit value');
        }

        return await this.commentService.getCommentThreadPaginated(
            postId,
            commentId,
            parsedLimit,
            cursor,
            userId,
        );
    }
}
