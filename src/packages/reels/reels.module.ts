import {Module} from '@nestjs/common';
import {ReelsService} from './reels.service';
import {ReelsController} from './reels.controller';
import { ReelsRepository } from './reels.repository';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
    controllers: [ReelsController],
    providers: [ReelsService, ReelsRepository, PrismaService],
})
export class ReelsModule {}