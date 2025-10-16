// src/modules/auth/device-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
// import { CacheService } from '../cache/cache.service';

@Injectable()
export class DeviceTrackingService {
  private readonly logger = new Logger(DeviceTrackingService.name);
  private readonly cachePrefix = 'device:';

  constructor(
    private readonly prisma: PrismaService,
    // private readonly cacheService: CacheService,
  ) { }

  async createDevice(deviceData: {
    userId: number;
    deviceName: string;
    userAgent: string;
    deviceType: string;
    ipAddress: string;
    location: string;
  }): Promise<any> {
    return this.prisma.userDevice.create({
      data: {
        ...deviceData,
        refreshToken: '', // Will be updated by token service
        isActive: true,
      },
    });
  }

  async findUserDevice(userId: number, userAgent: string, ipAddress: string) {
    return this.prisma.userDevice.findFirst({
      where: {
        userId,
        userAgent,
        ipAddress,
        isActive: true,
      },
      orderBy: {
        lastActive: 'desc',
      },
    });
  }

  async updateDevice(
    deviceId: number,
    metadata: {
      ipAddress: string;
      location?: string;
    },
  ) {
    return this.prisma.userDevice.update({
      where: {
        id: deviceId,
      },
      data: {
        lastActive: new Date(),
        ipAddress: metadata.ipAddress,
        location: metadata.location || undefined,
      },
    });
  }

  async deactivateDevice(deviceId: number): Promise<void> {
    try {
      // 1. Update device record in database
      const updatedDevice = await this.prisma.userDevice.update({
        where: { id: deviceId },
        data: {
          isActive: false,
          lastActive: new Date(),
          refreshToken: undefined, // Clear refresh token for security
        },
        select: { userId: true },
      });

      // 2. Update the cached active devices list for this user
      await this.cacheActiveDevicesForUser(updatedDevice.userId);

      this.logger.debug(`Device ${deviceId} deactivated`);
    } catch (error) {
      this.logger.error(
        `Device deactivation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async cacheActiveDevicesForUser(userId: number): Promise<void> {
    // Fetch only active devices for the user
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        ipAddress: true,
        location: true,
        lastActive: true,
      },
      orderBy: {
        lastActive: 'desc',
      },
    });

    // Cache the results with optimized TTL
    // await this.cacheService.set(
    //   `${this.cachePrefix}active:${userId}`,
    //   JSON.stringify(devices),
    //   3600, // Cache for 1 hour
    // );
  }
}
