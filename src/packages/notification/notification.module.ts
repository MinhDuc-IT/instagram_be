import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: Number(
            configService.get<string>('JWT_EXPIRES_IN', '3600'),
          ),
        },
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway, PrismaService],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

