import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BackgroundJobDto } from '../dto/background-job.dto';

@Injectable()
export class BackgroundJobRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: Omit<BackgroundJobDto, 'id'>): Promise<BackgroundJobDto> {
        return this.prisma.backgroundJob.create({
            data: {
                type: data.type,
                fileName: data.fileName,
                status: data.status,
                progress: data.progress || 0,
                retryCount: data.retryCount || 0,
                maxRetries: data.maxRetries || 3,
            },
        }) as Promise<BackgroundJobDto>;
    }

    async findById(id: string): Promise<BackgroundJobDto | null> {
        return this.prisma.backgroundJob.findUnique({
            where: { id },
        }) as Promise<BackgroundJobDto | null>;
    }

    async findAll(): Promise<BackgroundJobDto[]> {
        return this.prisma.backgroundJob.findMany({
            orderBy: { createdAt: 'desc' },
        }) as Promise<BackgroundJobDto[]>;
    }

    async findByStatus(status: string): Promise<BackgroundJobDto[]> {
        return this.prisma.backgroundJob.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
        }) as Promise<BackgroundJobDto[]>;
    }

    async findPending(): Promise<BackgroundJobDto[]> {
        return this.prisma.backgroundJob.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
            take: 10,
        }) as Promise<BackgroundJobDto[]>;
    }

    async update(id: string, data: Partial<BackgroundJobDto>): Promise<BackgroundJobDto> {
        return this.prisma.backgroundJob.update({
            where: { id },
            data,
        }) as Promise<BackgroundJobDto>;
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

        return this.prisma.backgroundJob.update({
            where: { id },
            data: updateData,
        }) as Promise<BackgroundJobDto>;
    }

    async updateResult(id: string, result: any): Promise<BackgroundJobDto> {
        return this.prisma.backgroundJob.update({
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
        }) as Promise<BackgroundJobDto>;
    }

    async updateError(
        id: string,
        error: string,
        retry: boolean = false,
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

        return this.prisma.backgroundJob.update({
            where: { id },
            data: updateData,
        }) as Promise<BackgroundJobDto>;
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.backgroundJob.delete({ where: { id } });
        return true;
    }

    async deleteOldJobs(hoursOld: number): Promise<number> {
        const cutoffDate = new Date(Date.now() - hoursOld * 3600 * 1000);
        const result = await this.prisma.backgroundJob.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });
        return result.count;
    }
}