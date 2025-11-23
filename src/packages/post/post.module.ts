import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { UploadAssetService } from '../../core/upload/services/upload-asset.service';
import { CloudinaryService } from '../../core/upload/services/cloudinary.service';
import { BullModule } from '@nestjs/bull';
import { UPLOAD_CONSTANTS } from '../../core/upload/constants/upload.constants';
import { cloudinaryProvider } from '../../config/cloudinary.config';
import { TransformService } from '../../core/upload/services/transform.service';
import { BackgroundJobRepository } from '../../core/upload/repositories/background-job.repository';

@Module({
    imports: [
        BullModule.registerQueue({
            name: UPLOAD_CONSTANTS.QUEUE_NAME,
        }),
    ],
    controllers: [PostController],
    providers: [PostService, PrismaService, UploadAssetService, CloudinaryService, cloudinaryProvider, TransformService, BackgroundJobRepository],
})
export class PostModule { }
