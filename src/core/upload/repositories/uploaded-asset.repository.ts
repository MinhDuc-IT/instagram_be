import { Injectable } from '@nestjs/common';
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UploadedAssetRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        return this.prisma.uploadedAsset.create({
            data: {
                publicId: data.publicId,
                type: data.type,
                fileName: data.fileName,
                url: data.url,
                secureUrl: data.secureUrl,
                format: data.format,
                width: data.width,
                height: data.height,
                duration: data.duration,
                fileSize: data.fileSize,
                folder: data.folder,
                tags: JSON.stringify(data.tags || []),
            },
        });
    }

    async findByPublicId(publicId: string) {
        return this.prisma.uploadedAsset.findUnique({
            where: { publicId },
        });
    }

    async findAll(skip = 0, take = 10) {
        return this.prisma.uploadedAsset.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        });
    }

    async findByType(type: 'image' | 'video', skip = 0, take = 10) {
        return this.prisma.uploadedAsset.findMany({
            where: {
                type,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        });
    }

    async findByFolder(folder: string, skip = 0, take = 10) {
        return this.prisma.uploadedAsset.findMany({
            where: {
                folder,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        });
    }

    async softDelete(publicId: string) {
        return this.prisma.uploadedAsset.update({
            where: { publicId },
            data: { deletedAt: new Date() },
        });
    }

    async hardDelete(publicId: string) {
        return this.prisma.uploadedAsset.delete({
            where: { publicId },
        });
    }

    async countByType(type: 'image' | 'video') {
        return this.prisma.uploadedAsset.count({
            where: {
                type,
                deletedAt: null,
            },
        });
    }
}
