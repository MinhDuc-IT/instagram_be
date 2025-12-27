import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryRepository } from './story.repository';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { BackgroundJobRepository } from 'src/core/upload/repositories/background-job.repository';
import { BullModule } from '@nestjs/bull';
import { UPLOAD_CONSTANTS } from 'src/core/upload/constants/upload.constants';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        BullModule.registerQueue({
            name: UPLOAD_CONSTANTS.QUEUE_NAME,
        }),
        JwtModule.register({}),
    ],
    controllers: [StoryController],
    providers: [StoryService, StoryRepository, PrismaService, BackgroundJobRepository]
})
export class StoryModule { }
