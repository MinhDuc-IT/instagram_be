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
            'JWT_EXPIRY_IN',
            '3600',
        ));
        this.refreshTokenExpiry = this.configService.get<number>(
            'REFRESH_TOKEN_EXPIRY_DAYS',
            7,
        );
    }

    generateTokens(userId: number, deviceId: number) {
        // Generate a unique token family for refresh token rotation
        const tokenFamily = uuidv4();

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

    private hashToken(token: string) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async revokeDeviceTokens(userId: number, deviceId: number): Promise<void> {
        try {
            // 1. Invalidate all access tokens for this device via pattern matching
            await this.cacheService.invalidatePattern(
                `token:${userId}:${deviceId}:*`,
            );

            // 2. Find the refresh token for this device
            const device = await this.prisma.userDevice.findUnique({
                where: { id: deviceId },
                select: { refreshToken: true },
            });

            if (device?.refreshToken) {
                // 3. Invalidate the specific refresh token
                await this.cacheService.delete(`refresh:${device.refreshToken}`);
            }

            // 4. Maintain a blacklist of revoked deviceIds for additional security
            // This helps prevent token reuse after logout
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