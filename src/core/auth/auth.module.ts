import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { TokenService } from "./token.service";
import { DeviceTrackingService } from "./device-tracking.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: Number(configService.get<string>('JWT_EXPIRES_IN', '3600')),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        TokenService, UserService,
        DeviceTrackingService,
        PrismaService,
        EmailService
    ],
    exports: [AuthService, TokenService, UserService, PrismaService],
})
export class AuthModule { }