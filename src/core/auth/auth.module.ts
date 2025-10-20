import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { TokenService } from "./token.service";
import { DeviceTrackingService } from "./device-tracking.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { JwtStrategy } from './strategies/jwt.strategy';
import { CacheService } from '../cache/cache.service';

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
    ],
    // imports: [
    //     PassportModule.register({ defaultStrategy: 'jwt' }),
    //     JwtModule.registerAsync({
    //         imports: [ConfigModule],
    //         inject: [ConfigService],
    //         useFactory: (configService: ConfigService) => ({
    //             secret: configService.get<string>('JWT_SECRET'),
    //             signOptions: {
    //                 expiresIn: Number(configService.get<string>('JWT_EXPIRES_IN', '3600')),
    //             },
    //         }),
    //     }),
    //     forwardRef(() => AuthModule), // nếu circular dependency thực sự
    // ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        CacheService,
        TokenService, 
        UserService,
        DeviceTrackingService,
        PrismaService,
        EmailService
    ],
    exports: [
        AuthService, 
        TokenService, 
        UserService, 
        PrismaService, 
    ],
})
export class AuthModule { }