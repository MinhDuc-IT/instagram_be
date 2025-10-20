import { Injectable, Inject, Logger } from '@nestjs/common';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { TransformOptionsDto } from '../dto/transform-options.dto';
import { TransformService } from './transform.service';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);

    constructor(
        @Inject('CLOUDINARY') private cloudinary: any,
        private transformService: TransformService,
    ) { }

    /**
     * Upload image async
     */
    async uploadImage(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = UPLOAD_CONSTANTS.IMAGE_FOLDER,
    ): Promise<UploadResponseDto> {
        return new Promise((resolve, reject) => {
            const uploadStream = this.cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                    public_id: this.generatePublicId(fileName),
                    eager: [
                        {
                            width: 1200,
                            height: 630,
                            crop: 'fill',
                            quality: 'auto',
                            fetch_format: 'auto',
                        },
                        {
                            width: 800,
                            height: 600,
                            crop: 'fill',
                            quality: 'auto',
                            fetch_format: 'auto',
                        },
                    ],
                    eager_async: true,
                    tags: ['upload', 'image', `original-${fileName}`],
                },
                (error, result) => {
                    if (error) {
                        this.logger.error(`Upload image error: ${fileName}`, error);
                        reject({
                            success: false,
                            error: error.message,
                            timestamp: new Date(),
                        } as UploadResponseDto);
                    } else {
                        resolve(this.mapUploadResponse(result));
                    }
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    /**
     * Upload video async
     */
    async uploadVideo(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = UPLOAD_CONSTANTS.VIDEO_FOLDER,
    ): Promise<UploadResponseDto> {
        return new Promise((resolve, reject) => {
            const uploadStream = this.cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'video',
                    public_id: this.generatePublicId(fileName),
                    eager: [
                        {
                            video_codec: 'h264',
                            audio_codec: 'aac',
                            bit_rate: '1m',
                            height: 720,
                            width: 1280,
                            crop: 'fill',
                            quality: 'auto',
                        },
                        {
                            video_codec: 'h264',
                            audio_codec: 'aac',
                            bit_rate: '500k',
                            height: 480,
                            width: 854,
                            crop: 'fill',
                            quality: 'auto',
                        },
                    ],
                    eager_async: true,
                    tags: ['upload', 'video', `original-${fileName}`],
                },
                (error, result) => {
                    if (error) {
                        this.logger.error(`Upload video error: ${fileName}`, error);
                        reject({
                            success: false,
                            error: error.message,
                            timestamp: new Date(),
                        } as UploadResponseDto);
                    } else {
                        resolve(this.mapUploadResponse(result));
                    }
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    /**
     * Delete asset
     */
    async deleteAsset(publicId: string): Promise<boolean> {
        try {
            const result = await this.cloudinary.uploader.destroy(publicId);
            this.logger.log(`Asset deleted: ${publicId}`);
            return result.result === 'ok';
        } catch (error) {
            this.logger.error(`Delete asset error: ${publicId}`, error);
            return false;
        }
    }

    /**
     * Get transformation URL
     */
    getTransformationUrl(
        publicId: string,
        options?: TransformOptionsDto,
    ): string {
        return this.transformService.getTransformationUrl(publicId, options);
    }

    /**
     * Get responsive URLs
     */
    getResponsiveUrls(publicId: string, baseOptions?: TransformOptionsDto) {
        return this.transformService.getResponsiveUrls(publicId, baseOptions);
    }

    // Private methods
    private mapUploadResponse(result: any): UploadResponseDto {
        return {
            success: true,
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration,
            fileSize: result.bytes,
            timestamp: new Date(),
        };
    }

    private generatePublicId(fileName: string): string {
        const timestamp = Date.now();
        const name = fileName.replace(/[^a-zA-Z0-9-_]/g, '-').split('.')[0];
        return `${name}_${timestamp}`;
    }
}