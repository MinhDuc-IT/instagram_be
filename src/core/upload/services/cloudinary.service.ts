import { Injectable, Inject, Logger } from '@nestjs/common';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { TransformService } from './transform.service';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';
import { UploadException } from '../exceptions/upload.exception';

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);

    constructor(
        @Inject('CLOUDINARY') private cloudinary: any,
        private transformService: TransformService,
    ) { }

    async uploadImage(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = UPLOAD_CONSTANTS.IMAGE_FOLDER,
    ): Promise<UploadResponseDto> {
        try {
            return await this.uploadToCloudinary(
                fileBuffer,
                fileName,
                folder,
                'image',
            );
        } catch (error) {
            this.logger.error(`Upload image error: ${fileName}`, error);
            throw new UploadException(`Failed to upload image: ${error.message}`);
        }
    }

    async uploadVideo(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = UPLOAD_CONSTANTS.VIDEO_FOLDER,
    ): Promise<UploadResponseDto> {
        try {
            return await this.uploadToCloudinary(
                fileBuffer,
                fileName,
                folder,
                'video',
            );
        } catch (error) {
            this.logger.error(`Upload video error: ${fileName}`, error);
            throw new UploadException(`Failed to upload video: ${error.message}`);
        }
    }

    async deleteAsset(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<boolean> {
        try {
            const result = await this.cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });

            this.logger.log(`Asset deleted: ${publicId}`);
            return result.result === 'ok';
        } catch (error) {
            this.logger.error(`Delete asset error: ${publicId}`, error);
            return false;
        }
    }

    private async uploadToCloudinary(
        fileBuffer: Buffer,
        fileName: string,
        folder: string,
        type: 'image' | 'video',
    ): Promise<UploadResponseDto> {
        return new Promise((resolve, reject) => {
            const options: any = {
                folder,
                public_id: this.generatePublicId(fileName),
                resource_type: type === 'video' ? 'video' : 'auto',
                tags: ['upload', type, `original-${fileName}`],
            };

            if (type === 'image') {
                options.eager = [
                    {
                        width: 1200,
                        height: 630,
                        crop: 'fill',
                        quality: 'auto',
                        fetch_format: 'auto',
                    },
                ];
                options.eager_async = true;
            } else {
                options.eager = [
                    {
                        video_codec: 'h264',
                        audio_codec: 'aac',
                        bit_rate: '1m',
                        height: 720,
                        width: 1280,
                        crop: 'fill',
                        quality: 'auto',
                    },
                ];
                options.eager_async = true;
            }

            const uploadStream = this.cloudinary.uploader.upload_stream(
                options,
                (error: any, result: any) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(this.mapUploadResponse(result));
                    }
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

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
        const name = fileName
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .split('.')[0]
            .toLowerCase();
        return `${name}_${timestamp}`;
    }
}