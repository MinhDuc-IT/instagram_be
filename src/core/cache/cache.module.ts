// src/core/cache/cache.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CacheService } from './cache.service';
import { LocalCacheService } from './local-cache.service';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('REDIS_URL'),
        db: configService.get('REDIS_DB', 0),
        enableReadyCheck: false,
      }),
    }),
  ],
  providers: [CacheService, LocalCacheService],
  exports: [CacheService, LocalCacheService],
})
export class CacheModule { }
