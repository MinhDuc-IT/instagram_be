import { Module } from '@nestjs/common';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { FollowRepository } from './follow.repository';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [FollowController],
  providers: [FollowService, FollowRepository, PrismaService],
  exports: [FollowService, FollowRepository],
})
export class FollowModule {}
