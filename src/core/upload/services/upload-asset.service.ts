import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadResponseDto } from '../dto/upload-response.dto';
import { UploadedAssetMapper } from '../mapper/uploaded-asset.mapper';

@Injectable()
export class UploadAssetService {
    private readonly logger = new Logger(UploadAssetService.name);

    constructor(private prisma: PrismaService) { }

    async saveAsset(
        result: UploadResponseDto,
        type: 'image' | 'video',
        fileName: string,
        folder: string,
        postId: string | null,
        storyId?: number,
    ) {
        try {
            const asset = await this.prisma.uploadedAsset.create({
                data: {
                    publicId: result.publicId,
                    type,
                    fileName,
                    url: result.url,
                    secureUrl: result.secureUrl,
                    format: result.format,
                    width: result.width,
                    height: result.height,
                    duration: result.duration,
                    fileSize: result.fileSize,
                    folder,
                    tags: JSON.stringify(['upload', type]),
                    postId: postId,
                    storyId: storyId,
                },
            });

            this.logger.log(`Asset saved: ${asset.publicId}`);

            if (storyId) {
                await this.prisma.story.update({
                    where: { id: storyId },
                    data: {
                        mediaUrl: result.secureUrl,
                        type: type,
                    } as any,
                });
            }

            return UploadedAssetMapper.toDto(asset);
        } catch (error) {
            this.logger.error(`Failed to save asset: ${result.publicId}`, error);
            throw error;
        }
    }

    async findByPublicId(publicId: string) {
        const asset = await this.prisma.uploadedAsset.findUnique({
            where: { publicId },
        });
        return UploadedAssetMapper.toDto(asset);
    }

    async findAll(skip = 0, take = 10, type?: 'image' | 'video') {
        const where: any = { deleted: false };
        if (type) where.type = type;

        const assets = await this.prisma.uploadedAsset.findMany({
            where,
            orderBy: { createdDate: 'desc' },
            skip,
            take,
        });

        return UploadedAssetMapper.toDtos(assets);
    }

    async deleteAsset(publicId: string) {
        await this.prisma.uploadedAsset.update({
            where: { publicId },
            data: {
                deleted: true,
                deletedDate: new Date(),
            },
        });

        this.logger.log(`Asset soft deleted: ${publicId}`);
        return true;
    }

    async getStats() {
        const [totalImages, totalVideos, totalSize] = await Promise.all([
            this.prisma.uploadedAsset.count({ where: { type: 'image', deleted: false } }),
            this.prisma.uploadedAsset.count({ where: { type: 'video', deleted: false } }),
            this.prisma.uploadedAsset.aggregate({
                where: { deleted: false },
                _sum: { fileSize: true },
            }),
        ]);

        return {
            totalImages,
            totalVideos,
            totalAssets: totalImages + totalVideos,
            totalSize: totalSize._sum.fileSize || 0,
        };
    }
}