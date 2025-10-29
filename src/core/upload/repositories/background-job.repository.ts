import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BackgroundJobDto } from '../dto/background-job.dto';
import { BackgroundJobMapper } from '../mapper/background-job.mapper';

@Injectable()
export class BackgroundJobRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: Omit<BackgroundJobDto, 'id'>): Promise<BackgroundJobDto> {
        const job = await this.prisma.backgroundJob.create({
            data: {
                type: data.type,
                fileName: data.fileName,
                status: data.status,
                progress: data.progress || 0,
                retryCount: data.retryCount || 0,
                maxRetries: data.maxRetries || 3,
            },
        });

        return BackgroundJobMapper.toDto(job)!;
    }

    async findById(id: string): Promise<BackgroundJobDto | null> {
        const job = await this.prisma.backgroundJob.findUnique({ where: { id } });
        return BackgroundJobMapper.toDto(job);
    }

    async findAll(): Promise<BackgroundJobDto[]> {
        const jobs = await this.prisma.backgroundJob.findMany({
            orderBy: { createdDate: 'desc' },
            take: 100,
        });
        return BackgroundJobMapper.toDtos(jobs);
    }

    async findByStatus(status: string): Promise<BackgroundJobDto[]> {
        const jobs = await this.prisma.backgroundJob.findMany({
            where: { status },
            orderBy: { createdDate: 'desc' },
        });
        return BackgroundJobMapper.toDtos(jobs);
    }

    async findPending(): Promise<BackgroundJobDto[]> {
        const jobs = await this.prisma.backgroundJob.findMany({
            where: { status: 'pending' },
            orderBy: { createdDate: 'asc' },
            take: 10,
        });
        return BackgroundJobMapper.toDtos(jobs);
    }

    async updateStatus(
        id: string,
        status: BackgroundJobDto['status'],
        progress?: number,
    ): Promise<BackgroundJobDto> {
        const updateData: any = { status };
        if (progress !== undefined) {
            updateData.progress = Math.min(progress, 100);
        }
        if (status === 'completed' || status === 'failed') {
            updateData.completedAt = new Date();
        }

        const job = await this.prisma.backgroundJob.update({
            where: { id },
            data: updateData,
        });

        return BackgroundJobMapper.toDto(job)!;
    }

    async updateResult(id: string, result: any): Promise<BackgroundJobDto> {
        const job = await this.prisma.backgroundJob.update({
            where: { id },
            data: {
                result,
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                publicId: result?.publicId,
                url: result?.url,
                secureUrl: result?.secureUrl,
                fileSize: result?.fileSize,
                format: result?.format,
            },
        });

        return BackgroundJobMapper.toDto(job)!;
    }

    async updateError(
        id: string,
        error: string,
        retry = false,
    ): Promise<BackgroundJobDto> {
        const job = await this.findById(id);
        if (!job) throw new Error('Job not found');

        const updateData: any = { error };

        if (retry && (job.retryCount ?? 0) < (job.maxRetries ?? 0)) {
            updateData.status = 'pending';
            updateData.retryCount = (job.retryCount ?? 0) + 1;
        } else {
            updateData.status = 'failed';
            updateData.completedAt = new Date();
        }

        const updated = await this.prisma.backgroundJob.update({
            where: { id },
            data: updateData,
        });

        return BackgroundJobMapper.toDto(updated)!;
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.backgroundJob.delete({ where: { id } });
        return true;
    }

    async deleteOldJobs(hoursOld: number): Promise<number> {
        const cutoffDate = new Date(Date.now() - hoursOld * 3600 * 1000);
        const result = await this.prisma.backgroundJob.deleteMany({
            where: {
                createdDate: { lt: cutoffDate },
                status: { in: ['completed', 'failed'] },
            },
        });
        return result.count;
    }
}