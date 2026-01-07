import { Module } from '@nestjs/common';
import { AiCaptionController } from './ai-caption.controller';
import { AiCaptionService } from './ai-caption.service';

@Module({
    controllers: [AiCaptionController],
    providers: [AiCaptionService],
    exports: [AiCaptionService],
})
export class AiCaptionModule { }
