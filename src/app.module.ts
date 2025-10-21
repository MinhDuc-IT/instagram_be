import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './packages/users/users.module';
import { PrismaService } from './core/prisma/prisma.service';
import { AuthModule } from './core/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { EmailModule } from './core/email/email.module';
import { ConfigModule as _ConfigModule } from './config/config.module';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  imports: [UsersModule, AuthModule, _ConfigModule, CacheModule, EmailModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, ChatGateway],
})
export class AppModule { }
