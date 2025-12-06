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
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { CommentDto, CreateCommentRequest, GetCommentsResponse } from './dto/comment.dto';

@ApiTags('Post')
@Controller('post')
@UseGuards(JwtAuthGuard)
export class PostController {
    constructor(
        private readonly postService: PostService,
        private readonly commentService: CommentService,
    ) { }

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
    @ApiOperation({ summary: 'Lấy thông tin bài viết' })
    async getPost(@Param('id') id: string, @Req() req: any) {
        const currentUserId = req.user?.id;
        const post = await this.postService.getPostById(id, currentUserId);
        if (!post) throw new NotFoundException('Post not found');
        return post;
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Lấy thông tin bài viết' })
    @TransformResponseDto(PostDto)
    async getPosts(@Param('userId') userId: number, @Req() req: any) {
        const currentUserId = req.user?.id;
        const posts = await this.postService.getPosts(userId, currentUserId);
        if (!posts) throw new NotFoundException('Posts not found');
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
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Lấy danh sách comment của bài viết' })
    @ApiResponse({ status: 200, description: 'Comments retrieved' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @TransformResponseDto(GetCommentsResponse)
    @ResponseMessage('Comments retrieved')
    async getComments(
        @Param('postId') postId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ) {
        return await this.commentService.getComments(postId, page || 1, limit || 20);
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
}
