import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

/**
 * - Quản lý lifecycle connect/disconnect
 * - Middleware Prisma để tự động set audit fields (CreatedBy, ModifiedBy, DeletedBy)
 * - Hỗ trợ soft delete
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly username: string | null;

    constructor(@Inject(REQUEST) private readonly request: Request) {
        super();
        // Lấy username từ request (ví dụ middleware JWT đã gắn req.user)
        this.username = (this.request as any)?.user?.username ?? null;
    }

    private attachMiddleware() {
        // Prisma middleware - attach AFTER connection
        (this as any).$use(async (params, next) => {
            const now = new Date();

            if (params.action === 'create' && params.args?.data) {
                params.args.data.createdDate = now;
                if (!params.args.data.createdBy && this.username) {
                    params.args.data.createdBy = this.username;
                }
                if ('deleted' in params.args.data) {
                    params.args.data.deleted = false;
                }
            }

            if (params.action === 'update' && params.args?.data) {
                params.args.data.modifiedDate = now;
                if (this.username) params.args.data.modifiedBy = this.username;
            }

            // Giả lập soft delete (nếu model có field deleted)
            if (params.action === 'delete') {
                params.action = 'update';
                params.args.data = {
                    deleted: true,
                    deletedDate: now,
                    deletedBy: this.username,
                };
            }

            return next(params);
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.attachMiddleware();
        this.logger.log('PrismaService connected to database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('PrismaService disconnected from database');
    }
}