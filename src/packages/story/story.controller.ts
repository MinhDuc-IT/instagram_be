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
import { FileValidationPipe } from '../../core/upload/pipes/file-validation.pipe';
import { MultiFileValidationPipe } from '../../core/upload/pipes/multi-file-validation.pipe';
import { UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { JobStatusResponseDto } from '../../core/upload/dto/background-job.dto';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { TransformResponseDto, ResponseMessage } from 'src/core/decorators/response.decorator';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { OptionalJwtAuthGuard } from 'src/core/guards/optional-jwt-auth.guard';
import { buildPaginatedResponse } from 'src/utils/buildPaginatedResponse';

@Controller('stories')
export class StoryController {
    constructor(private service: StoryService) { }

    // Home story feed
    @UseGuards(OptionalJwtAuthGuard)
    @Get('home')
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getHomeStories(
        @Req() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user?.id;

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Number(limit) || 10, 50);

        if (!userId) {
            return buildPaginatedResponse(
                [],
                0,
                pageNumber,
                limitNumber,
            );
        }

        return this.service.getHomeStories(
            userId,
            pageNumber,
            limitNumber,
        );
    }

    // View story
    @UseGuards(JwtAuthGuard)
    @Post(':id/view')
    async viewStory(@Req() req, @Param('id') id: string) {
        return this.service.viewStory(req.user.id, +id);
    }

    // Like / Unlike story
    @UseGuards(JwtAuthGuard)
    @Post(':id/like')
    async likeStory(@Req() req, @Param('id') id: string) {
        return this.service.likeStory(req.user.id, +id);
    }

    @Post('background')
    @HttpCode(HttpStatus.ACCEPTED)
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('files', 1, { storage: memoryStorage() }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Tạo story (upload nền async)',
        type: CreateStoryDto,
    })
    @ApiOperation({ summary: 'Create story background (async)' })
    @ApiResponse({ status: HttpStatus.ACCEPTED, type: JobStatusResponseDto })
    async createStoryBackground(
        @Body() body: CreateStoryDto,
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
            throw new BadRequestException('User not found in token');
        }

        return this.service.createStoryBackground(files[0], userId);
    }
}
