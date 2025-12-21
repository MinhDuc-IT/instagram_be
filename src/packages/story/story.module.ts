import { Module } from '@nestjs/common';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryRepository } from './story.repository';

@Module({
    controllers: [StoryController],
    providers: [StoryService, StoryRepository]
})
export class StoryModule { }
