import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    HttpStatus,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UploadAssetService } from '../services/upload-asset.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { TransformService } from '../services/transform.service';
import { QueryAssetDto } from '../dto/query-asset.dto';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { TransformOptionsDto } from '../dto/transform-options.dto';

@ApiTags('Assets')
@Controller('api/assets')
export class AssetController {
    private readonly logger = new Logger(AssetController.name);

    constructor(
        private readonly uploadAssetService: UploadAssetService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly transformService: TransformService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all assets with pagination' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Assets retrieved',
        type: [UploadResponseDto],
    })
    async getAssets(@Query() query: QueryAssetDto) {
        const assets = await this.uploadAssetService.findAll(
            Number(query.skip) || 0,
            Number(query.take) || 10,
            query.type,
        );

        return {
            data: assets,
            pagination: {
                skip: query.skip,
                take: query.take,
                total: assets.length,
            },
        };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get asset statistics' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Statistics retrieved',
    })
    async getStats() {
        return this.uploadAssetService.getStats();
    }

    @Get(':publicId')
    @ApiOperation({ summary: 'Get asset by public ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Asset retrieved',
        type: UploadResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Asset not found',
    })
    async getAsset(@Param('publicId') publicId: string) {
        const asset = await this.uploadAssetService.findByPublicId(publicId);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        return asset;
    }

    @Get(':publicId/transform')
    @ApiOperation({ summary: 'Get transformation URL for asset' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Transformation URL generated',
    })
    async getTransformUrl(
        @Param('publicId') publicId: string,
        @Query() options: TransformOptionsDto,
    ) {
        const asset = await this.uploadAssetService.findByPublicId(publicId);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        const transformUrl = this.transformService.getTransformationUrl(
            publicId,
            options,
        );

        return {
            publicId,
            originalUrl: asset.secureUrl,
            transformUrl,
            options,
        };
    }

    @Get(':publicId/responsive')
    @ApiOperation({ summary: 'Get responsive URLs for asset' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Responsive URLs generated',
    })
    async getResponsiveUrls(@Param('publicId') publicId: string) {
        const asset = await this.uploadAssetService.findByPublicId(publicId);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        const urls = this.transformService.getResponsiveUrls(publicId);

        return {
            publicId,
            originalUrl: asset.secureUrl,
            responsive: urls,
        };
    }

    @Get(':publicId/thumbnail')
    @ApiOperation({ summary: 'Get thumbnail URL for asset' })
    @ApiQuery({ name: 'size', required: false, type: Number })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Thumbnail URL generated',
    })
    async getThumbnail(
        @Param('publicId') publicId: string,
        @Query('size') size?: number,
    ) {
        const asset = await this.uploadAssetService.findByPublicId(publicId);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        const thumbnailUrl = this.transformService.getThumbnail(
            publicId,
            size ? parseInt(String(size)) : 200,
        );

        return {
            publicId,
            thumbnailUrl,
        };
    }

    @Delete(':publicId')
    @ApiOperation({ summary: 'Delete asset by public ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Asset deleted successfully',
    })
    async deleteAsset(@Param('publicId') publicId: string) {
        const asset = await this.uploadAssetService.findByPublicId(publicId);

        if (!asset) {
            throw new NotFoundException('Asset not found');
        }

        // Delete from Cloudinary
        const type = publicId.includes('video') ? 'video' : 'image';
        await this.cloudinaryService.deleteAsset(publicId, type);

        // Soft delete from database
        await this.uploadAssetService.deleteAsset(publicId);

        this.logger.log(`Asset deleted: ${publicId}`);

        return {
            success: true,
            message: 'Asset deleted successfully',
        };
    }
}