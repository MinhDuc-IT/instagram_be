import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './packages/users/users.module';
import { PrismaService } from './core/prisma/prisma.service';
import { AuthModule } from './core/auth/auth.module';
import { ConfigModule as _ConfigModule } from './config/config.module';

@Module({
  imports: [UsersModule, AuthModule, _ConfigModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }
