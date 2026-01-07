import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { AiCaptionService } from './ai-caption.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { ResponseMessage, TransformResponseDto } from '../../core/decorators/response.decorator';

@ApiTags('AI Caption')
@Controller('captions')
@ApiBearerAuth()
export class AiCaptionController {
    constructor(private readonly aiCaptionService: AiCaptionService) { }

    @Post('generate')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Generate Instagram captions using AI via n8n' })
    @ApiResponse({ status: 200, description: 'Captions generated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 500, description: 'AI generation failed' })
    @ResponseMessage('Captions generated successfully')
    async generate(@Body() dto: GenerateCaptionDto) {
        return this.aiCaptionService.generateCaption(dto);
    }
}
