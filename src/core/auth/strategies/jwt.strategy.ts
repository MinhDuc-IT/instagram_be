import { Injectable, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
// import { UserService } from '../user.service';
import { UserService } from '../../../packages/user/user.service';
import { CacheService } from '../../cache/cache.service';
import { JWTPayload } from '../dto/jwt.dto';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JWTPayload) {
    try {
      const { sub: userId, deviceId } = payload;

      // Check token blacklist for JIT (Just-In-Time) revocation
      const blacklistKey = `token:blacklist:${userId}:${deviceId}`;
      const isBlacklisted = await this.cacheService.get(blacklistKey);

      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Retrieve user from cache or database
      const user = await this.userService.findById(Number(userId));

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check trial expiration for unverified users
      if (
        !user.isVerified &&
        user.trialExpiresAt &&
        new Date(user.trialExpiresAt) < new Date()
      ) {
        throw new UnauthorizedException(
          'Trial period expired. Please verify your email to continue.',
        );
      }

      // Return user context for request
      return {
        userId: user.id,
        email: user.email,
        username: user.userName,
        deviceId,
      };
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
