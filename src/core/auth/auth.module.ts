import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
// import { UserService } from "./user.service";
import { TokenService } from "./token.service";
import { DeviceTrackingService } from "./device-tracking.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from "src/packages/user/user.module";

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
        PassportModule,
        UserModule
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        TokenService,
        DeviceTrackingService,
        PrismaService,
        EmailService
    ],
    exports: [
        AuthService,
        TokenService,
    ],
})
export class AuthModule { }