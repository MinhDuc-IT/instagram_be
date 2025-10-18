// src/core/cache/local-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';

interface CacheItem {
  value: string;
  expiry: number | null; // Unix timestamp in milliseconds
}

@Injectable()
export class LocalCacheService {
  private readonly logger = new Logger(LocalCacheService.name);
  private cache = new Map<string, CacheItem>();
  private readonly maxSize = 10000; // Maximum number of items in cache

  // Key access tracking for LRU implementation
  private keyAccessMap = new Map<string, number>();

  constructor() {
    // Chạy cleanup job định kỳ để xóa các mục hết hạn và giảm kích thước cache
    setInterval(() => this.cleanup(), 60000); // Run every minute
  }

  /**
   * Lấy giá trị từ local cache
   */
  get(key: string): string | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Kiểm tra hết hạn
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Cập nhật truy cập LRU
    this.updateKeyAccess(key);

    return item.value;
  }

  /**
   * Lưu giá trị vào local cache
   */
  set(key: string, value: string, ttlInSeconds?: number): void {
    try {
      // Kiểm tra kích thước cache và dọn dẹp nếu cần
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      const expiry = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null;
      this.cache.set(key, { value: String(value), expiry });

      // Cập nhật truy cập LRU
      this.updateKeyAccess(key);
    } catch (error) {
      this.logger.error(
        `Error setting local cache key ${key}: ${error.message}`,
      );
    }
  }

  /**
   * Xóa một key khỏi local cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.keyAccessMap.delete(key);
  }

  /**
   * Xóa tất cả các key khỏi local cache
   */
  clear(): void {
    this.cache.clear();
    this.keyAccessMap.clear();
  }

  /**
   * Lấy kích thước hiện tại của cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Loại bỏ phần tử ít được sử dụng nhất (Least Recently Used)
   */
  private evictLRU(): void {
    if (this.keyAccessMap.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    // Tìm key có thời gian truy cập cũ nhất
    for (const [key, timestamp] of this.keyAccessMap.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }

    // Xóa key cũ nhất
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Cập nhật thời gian truy cập gần nhất của key
   */
  private updateKeyAccess(key: string): void {
    this.keyAccessMap.set(key, Date.now());
  }

  /**
   * Dọn dẹp các mục hết hạn định kỳ
   */
  private cleanup(): void {
    try {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (item.expiry !== null && now > item.expiry) {
          this.delete(key);
        }
      }

      // Giảm kích thước cache nếu quá lớn
      while (this.cache.size > this.maxSize * 0.8) {
        // Giảm xuống 80% kích thước tối đa
        this.evictLRU();
      }
    } catch (error) {
      this.logger.error(`Error during cache cleanup: ${error.message}`);
    }
  }
}
