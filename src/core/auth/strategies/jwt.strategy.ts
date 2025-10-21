// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(
//     private readonly configService: ConfigService
//   ) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       secretOrKey: configService.get<string>('JWT_SECRET') as string,
//     });
//   }

//   async validate(payload: any) {
//     return { id: payload.sub, username: payload.username };
//   }
// }
// src/core/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user.service';
import { CacheService } from '../../cache/cache.service';
import { JWTPayload } from '../dto/jwt.dto';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private userService: UserService;

  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
    private readonly cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  onModuleInit() {
    // Lazy load UserService sau khi module init xong
    this.userService = this.moduleRef.get(UserService, { strict: false });
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
      const user = await this.userService.findById(userId);

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
        id: user.id,
        email: user.email,
        username: user.username,
        deviceId,
      };
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
