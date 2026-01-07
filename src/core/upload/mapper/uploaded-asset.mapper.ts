import { UploadedAsset } from '@prisma/client';
import { UploadResponseDto } from '../dto/upload-response.dto';

export class UploadedAssetMapper {
    static toDto(entity: UploadedAsset | null): UploadResponseDto | null {
        if (!entity) return null;

        return {
            success: true,
            id: entity.id,
            type: entity.type,
            fileName: entity.fileName,
            publicId: entity.publicId,
            url: entity.url,
            secureUrl: entity.secureUrl,
            format: entity.format,
            width: entity.width || undefined,
            height: entity.height || undefined,
            duration: entity.duration || undefined,
            fileSize: entity.fileSize,
            filter: entity.filter || undefined,
            timestamp: entity.createdDate,
        };
    }

    static toDtos(entities: UploadedAsset[]): UploadResponseDto[] {
        return entities.map((entity) => this.toDto(entity)!).filter(Boolean);
    }
}