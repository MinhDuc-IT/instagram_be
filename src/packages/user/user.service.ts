import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CacheKeyBuilder } from '../../core/cache/cache.config';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) {}

    async getAllUsers() {
        return this.prisma.user.findMany();
    }

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
        fullName: string;
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

    async findById(userId: number) {
        // Try to get from cache first
        const cacheKey = CacheKeyBuilder.userProfile(userId);
        const cachedUser = await this.cacheService.get(cacheKey);

        if (cachedUser) {
            return JSON.parse(cachedUser);
        }

        // If not in cache, get from database
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        // Cache the result if found
        if (user) {
            await this.cacheService.set(
                cacheKey,
                JSON.stringify(user),
                3600, // 1 hour
            );
        }

        return user;
    }

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

    async getUserProfile(userId: number, currentUserId?: number) {
        // Try to get from cache first
        const cacheKey = CacheKeyBuilder.userProfile(userId);
        const cachedUser = await this.cacheService.get(cacheKey);

        if (cachedUser) {
            return JSON.parse(cachedUser);
        }

        // Get user with posts count
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                Posts: {
                    where: { deleted: false },
                    select: { id: true },
                },
            },
        });

        if (!user) {
            return null;
        }

        // Count followers and following
        const followersCount = 0; // TODO: Implement followers count when Follower model is added
        const followingCount = 0; // TODO: Implement following count when Follower model is added
        const isFollowing = false; // TODO: Implement isFollowing when Follower model is added

        const profileData = {
            id: user.id,
            username: user.userName,
            email: user.email,
            avatar: '', // TODO: Add avatar field to User model if needed
            fullName: user.fullName || '',
            bio: '', // TODO: Add bio field to User model if needed
            followers: followersCount,
            following: followingCount,
            posts: user.Posts.length,
            isFollowing: currentUserId ? isFollowing : false,
            createdAt: user.createdAt.toISOString(),
        };

        // Cache the result
        await this.cacheService.set(
            cacheKey,
            JSON.stringify(profileData),
            3600, // 1 hour
        );

        return profileData;
    }
}