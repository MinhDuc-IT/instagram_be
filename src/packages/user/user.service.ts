import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CacheKeyBuilder } from '../../core/cache/cache.config';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) { }

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

        // if (cachedUser) {
        //     return JSON.parse(cachedUser);
        // }

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
                Post: {
                    where: { deleted: false },
                    select: { id: true },
                },
                Follow_Follow_followerIdToUser: true,
                Follow_Follow_followingIdToUser: true,
            },
        });

        console.log('Fetched user from DB:', user);
        if (!user) {
            return null;
        }

        // Count followers and following
        const followersCount = user.Follow_Follow_followerIdToUser.length;
        const followingCount = user.Follow_Follow_followingIdToUser.length;
        const isFollowing = user.Follow_Follow_followerIdToUser.some(
            (follow) => follow.followerId === currentUserId,
        );

        const profileData = {
            id: user.id,
            username: user.userName,
            password: user.password,
            email: user.email,
            avatar: user.avatar || '',
            fullName: user.fullName || '',
            bio: '', // TODO: Add bio field to User model if needed
            gender: user.gender,
            phone: user.phone || '',
            followers: followersCount,
            following: followingCount,
            posts: user.Post.length,
            isFollowing: isFollowing,
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

    async updateProfile(userId: number, data: { fullName?: string; avatar?: string; phone?: string; gender?: number }) {
        const updateData: any = {};
        if (data.fullName !== undefined) updateData.fullName = data.fullName;
        if (data.avatar !== undefined) updateData.avatar = data.avatar;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.gender !== undefined) updateData.gender = data.gender;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        // Invalidate cache for this user's profile
        const cacheKey = CacheKeyBuilder.userProfile(userId);
        await this.cacheService.delete(cacheKey);

        return updated;
    }
}