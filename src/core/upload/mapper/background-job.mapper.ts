import { BackgroundJob } from '@prisma/client';
import { BackgroundJobDto } from '../dto/background-job.dto';

export class BackgroundJobMapper {
    static toDto(entity: BackgroundJob | null): BackgroundJobDto | null {
        if (!entity) return null;

        return {
            id: entity.id,
            type: entity.type as 'image' | 'video',
            fileName: entity.fileName,
            status: entity.status as 'pending' | 'processing' | 'completed' | 'failed',
            result: entity.result ? (entity.result as any) : undefined,
            error: entity.error || undefined,
            progress: entity.progress,
            createdDate: entity.createdDate,
            completedAt: entity.completedAt || undefined,
            retryCount: entity.retryCount,
            maxRetries: entity.maxRetries,
        };
    }

    static toDtos(entities: BackgroundJob[]): BackgroundJobDto[] {
        return entities.map((entity) => this.toDto(entity)!).filter(Boolean);
    }

    static toPrismaUpdateInput(dto: Partial<BackgroundJobDto>): any {
        const data: any = {};

        if (dto.status !== undefined) data.status = dto.status;
        if (dto.progress !== undefined) data.progress = dto.progress;
        if (dto.result !== undefined) data.result = dto.result;
        if (dto.error !== undefined) data.error = dto.error;
        if (dto.retryCount !== undefined) data.retryCount = dto.retryCount;
        if (dto.completedAt !== undefined) data.completedAt = dto.completedAt;

        return data;
    }
}