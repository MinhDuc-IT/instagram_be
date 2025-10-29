import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './packages/user/user.module';
import { PrismaService } from './core/prisma/prisma.service';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { EmailModule } from './core/email/email.module';
import { ConfigModule as _ConfigModule } from './config/config.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    _ConfigModule,
    ConfigModule.forRoot(),
    ConfigModule,
    CacheModule,
    EmailModule,
    UserModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
