import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UPLOAD_CONSTANTS } from '../constants/upload.constants';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectQueue(UPLOAD_CONSTANTS.QUEUE_NAME)
    private readonly uploadQueue: Queue,
  ) {}

  async onModuleInit() {
    // Tạo repeatable job chạy hằng ngày 23h VN
    await this.uploadQueue.add(
      'cleanupOldJobs',
      {},
      {
        repeat: { cron: '0 16 * * *' }, // 23h VN
        removeOnComplete: false,
      },
    );

    this.logger.log('Registered repeatable cleanup job at 23h VN');
  }
}

