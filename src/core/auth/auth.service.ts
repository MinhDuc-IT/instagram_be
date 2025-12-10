import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientMetadata, RegisterUserDto } from './dto/register.dto';
import { LoginResponseDto, LoginUserDto } from './dto/login.dto';
import { CacheKeyBuilder, CacheConfig } from 'src/core/cache/cache.config';
import { CacheService } from 'src/core/cache/cache.service';
import { EmailService } from 'src/core/email/email.service';
// import { UserService } from './user.service';
import { UserService } from 'src/packages/user/user.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceTrackingService } from './device-tracking.service';
import * as bcrypt from 'bcrypt';
import * as geoip from 'geoip-lite';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly deviceTrackingService: DeviceTrackingService,
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) { }

  async register(registerDto: RegisterUserDto, clientMetadata: ClientMetadata) {
    // Check if user already exists
    const existingUser = await this.userService.findByEmailOrUsername(
      registerDto.email,
      registerDto.username,
    );

    if (existingUser) {
      throw new BadRequestException(
        'User with this email or username already exists',
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    // Generate authId for external authentication
    const authId = uuidv4();

    // Create user with trial expiration date (15 days from now)
    const trialExpiresAt = addDays(new Date(), 15);

    const user = await this.userService.create({
      email: registerDto.email,
      userName: registerDto.username,
      fullName: registerDto.fullname,
      password: hashedPassword,
      authId,
      trialExpiresAt,
      isVerified: true,
      lastLogin: new Date(),
    });

    // Create device record
    const device = await this.deviceTrackingService.createDevice({
      userId: user.id,
      deviceName: clientMetadata.deviceName || 'Unknown Device',
      userAgent: clientMetadata.userAgent,
      deviceType: this.detectDeviceType(clientMetadata.userAgent),
      ipAddress: clientMetadata.ipAddress,
      location: await this.detectLocation(clientMetadata.ipAddress),
    });

    // Generate tokens
    const { accessToken, refreshToken, expiresAt, tokenFamily } =
      this.tokenService.generateTokens(user.id, device.id);

    // Store refresh token
    await this.tokenService.storeRefreshToken(
      user.id,
      device.id,
      refreshToken,
      expiresAt,
      tokenFamily,
    );

    // Cache user data
    await this.cacheUser(user);

    // Send verification email
    await this.sendVerificationEmail(user);

    return {
      id: user.id,
      username: user.userName,
      fullname: user.fullName,
      email: user.email,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private async cacheUser(user: any): Promise<void> {
    const userCacheKey = CacheKeyBuilder.userProfile(user.id);
    await this.cacheService.set(
      userCacheKey,
      JSON.stringify(user),
      CacheConfig.ttl.MEDIUM,
    );
  }

  async login(
    loginDto: LoginUserDto,
    clientMetadata: {
      ipAddress: string;
      userAgent: string;
      deviceName: string;
    },
  ): Promise<any> {
    try {
      // Attempt to find user by username or email
      const user = await this.findUserByCredential(loginDto.credential);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const passwordValid = await this.verifyPassword(
        loginDto.password,
        user.password,
      );

      if (!passwordValid) {
        // Implement rate limiting for failed login attempts
        await this.trackFailedLoginAttempt(
          loginDto.credential,
          clientMetadata.ipAddress,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user trial has expired
      if (
        !user.isVerified ||
        (user.trialExpiresAt && new Date(user.trialExpiresAt) < new Date())
      ) {
        throw new UnauthorizedException(
          'Trial period expired. Please verify your email to continue.',
        );
      }

      // Track or create device
      const device = await this.trackUserDevice(user.id, clientMetadata);

      // Generate tokens
      const { accessToken, refreshToken, expiresAt, tokenFamily } =
        this.tokenService.generateTokens(user.id, device.id);

      // Store refresh token
      await this.tokenService.storeRefreshToken(
        user.id,
        device.id,
        refreshToken,
        expiresAt,
        tokenFamily,
      );

      // Update last login timestamp
      await this.userService.updateLastLogin(user.id);

      // Invalidate and update cache
      // await this.updateUserCache(user.id);

      return {
        id: user.id,
        username: user.username || user.userName,
        email: user.email,
        accessToken,
        refreshToken,
        expiresAt,
        avatar: user.avatar,
        fullName: user.fullName,
        gender: user.gender,
        phone: user.phone,
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async verifyAccount(token: string) {
    try {
      // Find verification record with valid token and expiration
      const verification = await this.prisma.userVerification.findFirst({
        where: {
          token,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isVerified: true,
            },
          },
        },
      });

      if (!verification) {
        throw new NotFoundException('Invalid or expired verification token');
      }

      if (verification.user.isVerified) {
        return { verified: true, message: 'Account is already verified' };
      }

      // Perform verification in a transaction
      await this.prisma.$transaction([
        // Mark token as used
        this.prisma.userVerification.update({
          where: { id: verification.id },
          data: { isUsed: true },
        }),

        // Update user verification status
        this.prisma.user.update({
          where: { id: verification.userId },
          data: {
            isVerified: true,
            trialExpiresAt: undefined, // Remove grace period limitation
          },
        }),
      ]);

      // Cache invalidation and email confirmation logic...

      return { verified: true, message: 'Account successfully verified' };
    } catch {
      // Error handling...
      throw new NotFoundException('Invalid or expired verification token');
    }
  }

  async upsertUserSocialMedia(fbUser: any, clientMetadata: ClientMetadata) {
    let user: any = null;
    const tokenLogin = uuidv4();
    user = await this.prisma.user.findUnique({
      where: { email: fbUser.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: fbUser.email,
          userName: fbUser.lastName + ' ' + fbUser.firstName,
          fullName: fbUser.lastName + ' ' + fbUser.firstName,
          loginToken: tokenLogin,
          password: '',
          isVerified: false,
          loginType: 'FACEBOOK',
          lastLogin: new Date(),
        },
      });

      const device = await this.deviceTrackingService.createDevice({
        userId: user.id,
        deviceName: clientMetadata.deviceName || 'Unknown Device',
        userAgent: clientMetadata.userAgent,
        deviceType: this.detectDeviceType(clientMetadata.userAgent),
        ipAddress: clientMetadata.ipAddress,
        location: await this.detectLocation(clientMetadata.ipAddress),
      });

      const { refreshToken, expiresAt, tokenFamily } =
        this.tokenService.generateTokens(user.id, device.id);

      // Store refresh token
      await this.tokenService.storeRefreshToken(
        user.id,
        device.id,
        refreshToken,
        expiresAt,
        tokenFamily,
      );
    }

    return user;
  }

  async checkTokenLogin(userId: number, tokenLogin: string, clientMetadata: ClientMetadata) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, loginToken: tokenLogin },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }
    let newTokenLogin = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginToken: newTokenLogin,
        isVerified: true,
        lastLogin: new Date(),
      },
    });

    const device = await this.trackUserDevice(user.id, clientMetadata);

    // Generate tokens
    const { accessToken, refreshToken, expiresAt, tokenFamily } =
      this.tokenService.generateTokens(user.id, device.id);

    // Store refresh token
    await this.tokenService.storeRefreshToken(
      user.id,
      device.id,
      refreshToken,
      expiresAt,
      tokenFamily,
    );

    // Update last login timestamp
    await this.userService.updateLastLogin(user.id);

    // Invalidate and update cache
    // await this.updateUserCache(user.id);

    return {
      id: user.id,
      username: user.userName,
      email: user.email,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async logout(userId: number, deviceId: number): Promise<void> {
    try {
      // Execute these operations in parallel for performance
      const operations = [
        // 1. Invalidate the device's tokens
        this.tokenService.revokeDeviceTokens(userId, deviceId),

        // 2. Mark the device as inactive
        this.deviceTrackingService.deactivateDevice(deviceId),

        // 3. Remove related cache entries
        this.clearLogoutRelatedCache(userId, deviceId),
      ];

      await Promise.all(operations);

      this.logger.log(`User ${userId} logged out from device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      // Even if there's an error, we consider the logout successful from the user's perspective
      // This prevents leaked tokens from remaining valid
    }
  }

  private async clearLogoutRelatedCache(
    userId: number,
    deviceId: number,
  ): Promise<void> {
    // Clear device-specific cache
    await this.cacheService.delete(`device:${deviceId}`);

    // We don't clear all user cache to avoid performance impact on other devices
    // Just invalidate the specific device session information
    await this.cacheService.delete(`session:${userId}:${deviceId}`);
  }

  private async findUserByCredential(credential: string): Promise<any> {
    // Try cache first for performance
    const cacheKey = `auth:credential:${credential}`;
    const cachedUserId = await this.cacheService.get(cacheKey);

    if (cachedUserId) {
      return this.userService.findById(Number(cachedUserId));
    }

    // Query database if not in cache
    const user = await this.userService.findByEmailOrUsername(
      credential,
      credential,
    );

    // Cache the result for future lookups
    if (user) {
      await this.cacheService.set(
        cacheKey,
        String(user.id),
        CacheConfig.ttl.MEDIUM,
      );
    }

    return user;
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async trackFailedLoginAttempt(
    credential: string,
    ipAddress: string,
  ): Promise<void> {
    // Implement rate limiting for security
    const rateLimitKey = `auth:ratelimit:${ipAddress}`;
    const result = await this.cacheService.rateLimitCheck(
      rateLimitKey,
      5, // Max 5 attempts
      300, // Within 5 minutes
    );
    if (!result.allowed) {
      this.logger.warn(`Rate limit exceeded for IP: ${ipAddress}`);
      throw new UnauthorizedException(
        'Too many failed attempts. Please try again later.',
      );
    }
  }

  private async trackUserDevice(userId: number, metadata: any): Promise<any> {
    // Check if device already exists for this user
    const existingDevice = await this.deviceTrackingService.findUserDevice(
      userId,
      metadata.userAgent,
      metadata.ipAddress,
    );

    if (existingDevice) {
      // Update existing device record
      return this.deviceTrackingService.updateDevice(
        existingDevice.id,
        metadata,
      );
    }

    // Create new device record
    return this.deviceTrackingService.createDevice({
      userId,
      deviceName: metadata.deviceName,
      userAgent: metadata.userAgent,
      deviceType: this.detectDeviceType(metadata.userAgent),
      ipAddress: metadata.ipAddress,
      location: await this.detectLocation(metadata.ipAddress),
    });
  }

  // private async updateUserCache(userId: string): Promise<void> {
  //     // Invalidate old user data
  //     const userCacheKey = CacheKeyBuilder.userProfile(userId);
  //     await this.cacheService.delete(userCacheKey);

  //     // Fetch fresh user data
  //     const user = await this.userService.findById(userId);

  //     // Update cache with fresh data
  //     await this.cacheService.set(
  //         userCacheKey,
  //         JSON.stringify(user),
  //         CacheConfig.ttl.MEDIUM,
  //     );
  // }

  private detectDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    if (/ipad/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  private async detectLocation(ipAddress: string): Promise<string> {
    try {
      // Check cache first
      const cacheKey = `ip:location:${ipAddress}`;
      // const cachedLocation = await this.cacheService.get(cacheKey);
      // if (cachedLocation) {
      //     return cachedLocation;
      // }

      // Skip lookups for localhost or internal IPs
      if (
        ipAddress === '127.0.0.1' ||
        ipAddress === 'localhost' ||
        ipAddress.startsWith('192.168.') ||
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.16.')
      ) {
        return 'Local Network';
      }

      // Lookup IP information
      const geo = geoip.lookup(ipAddress);

      if (!geo) {
        return 'Unknown Location';
      }

      // Format location data
      const location = [geo.city, geo.region, geo.country]
        .filter(Boolean)
        .join(', ');

      // Cache the result for future lookups
      // await this.cacheService.set(cacheKey, location, 86400); // Cache for 24 hours

      return location || 'Unknown Location';
    } catch (error) {
      this.logger.warn(
        `Location detection failed for IP ${ipAddress}: ${error.message}`,
      );
      return 'Unknown Location';
    }
  }

  private async sendVerificationEmail(user: any) {
    try {
      // Generate verification token
      const verificationToken = uuidv4();
      const expiresAt = addDays(new Date(), 3); // Token valid for 3 days

      // Store verification token in database
      await this.userService.createVerificationToken(
        user.id,
        verificationToken,
        expiresAt,
      );

      // Verification link
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

      // Send email
      await this.emailService.sendEmail({
        recipients: [user.email],
        subject: 'Verify Your Email Address',
        body: `
                <h1>Welcome to our platform!</h1>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="${verificationLink}">Verify Email</a></p>
                <p>This link will expire in 3 days.</p>
                <p>If you didn't create this account, please ignore this email.</p>
              `,
        isHtml: true,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      // Don't throw error to prevent registration process from failing
    }
  }
}
