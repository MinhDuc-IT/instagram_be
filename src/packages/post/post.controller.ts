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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CreatePostDto } from './dto/create-post.dto';
import { PostService } from './post.service';
import { FileValidationPipe } from '../../core/upload/pipes/file-validation.pipe';
import { MultiFileValidationPipe } from '../../core/upload/pipes/multi-file-validation.pipe';
import { UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { JobStatusResponseDto } from '../../core/upload/dto/background-job.dto';
import { Public } from 'src/core/decorators/response.decorator';

@ApiTags('Post')
@Controller('post')
@Public()
export class PostController {
    constructor(private readonly postService: PostService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
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
        const userId = req.user?.id ?? 5;
        return this.postService.createPost(body, files, userId);
    }

    @Post('background')
    @HttpCode(HttpStatus.ACCEPTED)
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
        const userId = req.user?.id ?? 5;
        return this.postService.createPostBackground(body, files, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin bài viết' })
    async getPost(@Param('id') id: string) {
        const post = await this.postService.getPostById(id);
        if (!post) throw new NotFoundException('Post not found');
        return post;
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Lấy thông tin bài viết' })
    async getPosts(@Param('userId') userId: number) {
        const posts = await this.postService.getPosts(userId);
        if (!posts) throw new NotFoundException('Posts not found');
        return posts;
    }
}
