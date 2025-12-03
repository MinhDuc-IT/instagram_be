import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.PostCreateInput) {
        return this.prisma.post.create({ data });
    }

    async findAll(filter?: Prisma.PostWhereInput) {
        return this.prisma.post.findMany({
            where: { deleted: false, ...filter },
            include: { media: true, user: true },
            orderBy: { createdDate: 'desc' },
        });
    }

    async findById(id: string) {
        return this.prisma.post.findUnique({
            where: { id },
            include: { media: true, user: true },
        });
    }

    async update(id: string, data: Prisma.PostUpdateInput) {
        return this.prisma.post.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string) {
        return this.prisma.post.update({
            where: { id },
            data: {
                deleted: true,
            },
        });
    }
}
