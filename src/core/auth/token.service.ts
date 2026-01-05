import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { addDays } from 'date-fns';
import { JWTPayload } from './dto/jwt.dto';

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);
    private readonly accessTokenSecret: string;
    private readonly accessTokenExpiry: number;
    private readonly refreshTokenExpiry: number;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly cacheService: CacheService,
    ) {
        this.accessTokenSecret = this.configService.get<string>('JWT_SECRET') ?? '';
        this.accessTokenExpiry = Number(this.configService.get<string>(
            'JWT_EXPIRES_IN',
            '3600',
        ));
        this.refreshTokenExpiry = this.configService.get<number>(
            'REFRESH_TOKEN_EXPIRY_DAYS',
            7,
        );
    }

    generateTokens(userId: number, deviceId: number, existingFamily?: string) {
        // Generate or reuse token family for refresh token rotation
        const tokenFamily = existingFamily || uuidv4();

        // Generate JWT access token
        const payload: JWTPayload = {
            sub: userId,
            deviceId,
        };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.accessTokenSecret,
            expiresIn: this.accessTokenExpiry,
        });

        // Generate refresh token (secure random string)
        const refreshToken = crypto.randomBytes(40).toString('hex');

        // Calculate expiration date
        const expiresAt = addDays(new Date(), this.refreshTokenExpiry);

        return {
            accessToken,
            refreshToken,
            expiresAt,
            tokenFamily,
        };
    }

    async verifyRefreshToken(token: string) {
        const hashedToken = this.hashToken(token);

        // 1. Check cache first
        const cacheKey = `token:refresh:${hashedToken}`;
        const cached = await this.cacheService.get(cacheKey);

        if (cached) {
            const parsed = JSON.parse(cached);
            if (!parsed.valid) return null;
        }

        // 2. Query Database
        const tokenRecord = await this.prisma.userToken.findFirst({
            where: { refreshToken: hashedToken },
        });

        if (!tokenRecord) return null;

        // 3. Validate
        if (tokenRecord.invalidated) {
            this.logger.warn(`Detection of token reuse! Family: ${tokenRecord.refreshTokenFamily}`);
            return { reuse: true, family: tokenRecord.refreshTokenFamily, userId: tokenRecord.userId };
        }

        if (tokenRecord.expiresAt < new Date()) {
            return null; // Expired
        }

        return {
            reuse: false,
            userId: tokenRecord.userId,
            deviceId: tokenRecord.deviceId,
            tokenFamily: tokenRecord.refreshTokenFamily,
            recordId: tokenRecord.id,
        };
    }

    async invalidateRefreshToken(id: number, hashedToken: string) {
        await this.prisma.userToken.update({
            where: { id },
            data: { invalidated: true },
        });
        await this.cacheService.delete(`token:refresh:${hashedToken}`);
    }

    async invalidateTokenFamily(family: string) {
        await this.prisma.userToken.updateMany({
            where: { refreshTokenFamily: family },
            data: { invalidated: true },
        });
        // Note: clearing cache for all tokens in family would be better but pattern match is needed
    }

    async storeRefreshToken(
        userId: number,
        deviceId: number,
        refreshToken: string,
        expiresAt: Date,
        tokenFamily: string,
    ) {
        // Hash the refresh token before storing
        const hashedToken = this.hashToken(refreshToken);

        // Store the token in the database
        await this.prisma.userToken.create({
            data: {
                userId,
                deviceId,
                refreshToken: hashedToken,
                refreshTokenFamily: tokenFamily, // Use the provided token family
                expiresAt,
                invalidated: false,
            },
        });

        // Cache the token validity
        const cacheKey = `token:refresh:${hashedToken}`;
        await this.cacheService.set(
            cacheKey,
            JSON.stringify({ userId, deviceId, tokenFamily, valid: true }),
            this.refreshTokenExpiry * 24 * 60 * 60, // Convert days to seconds
        );
    }

    hashToken(token: string) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async revokeDeviceTokens(userId: number, deviceId: number): Promise<void> {
        try {
            // 1. Invalidate all access tokens for this device via pattern matching
            await this.cacheService.invalidatePattern(
                `token:${userId}:${deviceId}:*`,
            );

            // 2. Mark all refresh tokens for this device as invalidated
            await this.prisma.userToken.updateMany({
                where: { deviceId, userId },
                data: { invalidated: true }
            });

            // 3. Maintain a blacklist of revoked deviceIds for additional security
            await this.cacheService.set(
                `revoked:${deviceId}`,
                Date.now().toString(),
                86400 * 7, // Keep in blacklist for 7 days
            );

            this.logger.debug(`Revoked tokens for device ${deviceId}`);
        } catch (error) {
            this.logger.error(
                `Token revocation failed: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}