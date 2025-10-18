import { Injectable } from '@nestjs/common';
import { CacheService } from './core/cache/cache.service';

@Injectable()
export class AppService {
  constructor(private readonly cacheService: CacheService) { }

  async onModuleInit() {
    await this.cacheService.testConnection();
  }
  getHello(): string {
    return 'Hello World!';
  }
}
