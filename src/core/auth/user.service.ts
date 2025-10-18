import { Injectable } from "@nestjs/common";
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from "../cache/cache.service";
import { CacheKeyBuilder } from "src/core/cache/cache.config";

@Injectable()
export class UserService {
    // User service methods would be defined here
    constructor(private readonly prisma: PrismaService) { }

    async findByEmailOrUsername(email: string, userName: string) {
        return this.prisma.user.findFirst({
            where: {
                OR: [{ email }, { userName }],
            },
        });
    }

    async create(userData: {
        email: string;
        userName: string;
        password: string;
        authId: string;
        trialExpiresAt: Date;
        isVerified: boolean;
        lastLogin: Date;
    }) {
        return this.prisma.user.create({
            data: userData,
        });
    }

    // async findById(userId: number) {
    //     // Try to get from cache first
    //     const cacheKey = CacheKeyBuilder.userProfile(userId);
    //     // const cachedUser = await this.cacheService.get(cacheKey);

    //     if (cachedUser) {
    //         return JSON.parse(cachedUser);
    //     }

    //     // If not in cache, get from database
    //     const user = await this.prisma.user.findUnique({
    //         where: { id: userId },
    //     });

    //     // Cache the result if found
    //     if (user) {
    //         await this.cacheService.set(
    //             cacheKey,
    //             JSON.stringify(user),
    //             3600, // 1 hour
    //         );
    //     }

    //     return user;
    // }

    async updateLastLogin(userId: number): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastLogin: new Date() },
        });
    }

    async createVerificationToken(
        userId: number,
        token: string,
        expiresAt: Date,
    ) {
        return this.prisma.userVerification.create({
            data: {
                userId,
                token,
                expiresAt,
                isUsed: false,
            },
        });
    }


}