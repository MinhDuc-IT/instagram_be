// src/core/cache/cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { LocalCacheService } from './local-cache.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 3600; // 1 hour in seconds

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly localCache: LocalCacheService,
  ) { }

  /**
   * Lấy giá trị từ cache, kiểm tra cache local trước, sau đó Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      // Kiểm tra local cache trước
      const localValue = this.localCache.get(key);
      if (localValue !== null) {
        return localValue;
      }

      // Nếu không có trong local cache, kiểm tra Redis
      const value = await this.redis.get(key);

      // Lưu vào local cache nếu tìm thấy trong Redis
      if (value !== null) {
        this.localCache.set(key, value);
      }

      return value;
    } catch (error) {
      this.logger.error(
        `Error getting cache key ${key}: ${error.message}`,
        error.stack,
      );
      return null; // Trả về null khi có lỗi để ứng dụng vẫn hoạt động
    }
  }

  /**
   * Lưu giá trị vào cache (cả Redis và local)
   */
  async set(
    key: string,
    value: string,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    try {
      // Lưu vào Redis
      await this.redis.set(key, value, 'EX', ttl);

      // Đồng thời lưu vào local cache với TTL ngắn hơn
      const localTTL = Math.min(ttl, 300); // Tối đa 5 phút cho local cache
      this.localCache.set(key, value, localTTL);
    } catch (error) {
      this.logger.error(
        `Error setting cache key ${key}: ${error.message}`,
        error.stack,
      );
    }
  }

  async testConnection() {
    try {
      await this.redis.set('foo', 'bar');
      const value = await this.redis.get('foo');
      console.log('✅ Redis Cloud connected successfully:', value);
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  /**
   * Xóa một key khỏi cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.localCache.delete(key);
    } catch (error) {
      this.logger.error(
        `Error deleting cache key ${key}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Vô hiệu hóa cache theo pattern (chỉ áp dụng với Redis)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Sử dụng scan thay vì keys để tránh block Redis
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          1000,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          // Xóa các keys từ Redis
          await this.redis.del(...keys);

          // Xóa các keys từ local cache
          keys.forEach((key) => this.localCache.delete(key));
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(
        `Error invalidating cache pattern ${pattern}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Lấy nhiều keys cùng lúc
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];

    try {
      // Kiểm tra local cache trước
      const localResults = keys.map((key) => this.localCache.get(key));

      // Nếu tất cả đều có trong local cache, trả về luôn
      if (!localResults.includes(null)) {
        return localResults;
      }

      // Lấy danh sách keys cần kiểm tra từ Redis
      const keysToCheck = keys.filter(
        (_, index) => localResults[index] === null,
      );

      // Truy vấn Redis
      const redisResults = await this.redis.mget(...keysToCheck);

      // Kết hợp kết quả
      let redisIndex = 0;
      return localResults.map((localValue, index) => {
        if (localValue !== null) {
          return localValue;
        }

        const redisValue = redisResults[redisIndex++];
        if (redisValue !== null) {
          this.localCache.set(keys[index], redisValue);
        }

        return redisValue;
      });
    } catch (error) {
      this.logger.error(`Error executing mget: ${error.message}`, error.stack);
      return keys.map(() => null);
    }
  }

  /**
   * Hash operations - hữu ích cho việc lưu trữ các đối tượng phức tạp
   */
  async hset(
    key: string,
    field: string,
    value: string,
    ttl?: number,
  ): Promise<void> {
    try {
      await this.redis.hset(key, field, value);
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      this.logger.error(
        `Error setting hash field ${key}:${field}: ${error.message}`,
        error.stack,
      );
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      this.logger.error(
        `Error getting hash field ${key}:${field}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(
        `Error getting hash ${key}: ${error.message}`,
        error.stack,
      );
      return {};
    }
  }

  /**
   * Increment operations - hữu ích cho counters
   */
  async increment(
    key: string,
    value: number = 1,
    ttl?: number,
  ): Promise<number> {
    try {
      const result = await this.redis.incrby(key, value);
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      this.logger.error(
        `Error incrementing key ${key}: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Sorted Set operations - hữu ích cho rankings, leaderboards
   */
  async zadd(
    key: string,
    score: number,
    member: string,
    ttl?: number,
  ): Promise<void> {
    try {
      await this.redis.zadd(key, score, member);
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
    } catch (error) {
      this.logger.error(
        `Error adding to sorted set ${key}: ${error.message}`,
        error.stack,
      );
    }
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false,
  ): Promise<string[]> {
    try {
      if (withScores) {
        return await this.redis.zrange(key, start, stop, 'WITHSCORES');
      } else {
        return await this.redis.zrange(key, start, stop);
      }
    } catch (error) {
      this.logger.error(
        `Error getting range from sorted set ${key}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Rate-limiting utilities
   */
  async rateLimitCheck(
    key: string,
    limit: number,
    windowInSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const current = await this.increment(key, 1, windowInSeconds);
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
      };
    } catch (error) {
      this.logger.error(
        `Error checking rate limit ${key}: ${error.message}`,
        error.stack,
      );
      // Nếu có lỗi, cho phép request đi qua nhưng với số remaining thấp
      return {
        allowed: true,
        remaining: 1,
      };
    }
  }
}
