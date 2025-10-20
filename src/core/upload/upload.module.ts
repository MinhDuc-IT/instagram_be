import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './controllers/upload.controller';
import { CloudinaryService } from './services/cloudinary.service';
import { BackgroundJobService } from './services/background-job.service';
import { TransformService } from './services/transform.service';
import { BackgroundJobRepository } from './repositories/background-job.repository';
import { UploadedAssetRepository } from './repositories/uploaded-asset.repository';
import { cloudinaryProvider } from '../../config/cloudinary.config';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [
        MulterModule.register({
            storage: memoryStorage(),
            limits: {
                fileSize: 500 * 1024 * 1024, // 500MB
            },
        }),
    ],
    controllers: [UploadController],
    providers: [
        CloudinaryService,
        BackgroundJobService,
        TransformService,
        BackgroundJobRepository,
        UploadedAssetRepository,
        cloudinaryProvider,
        PrismaService,
    ],
    exports: [
        CloudinaryService,
        BackgroundJobService,
        TransformService,
        BackgroundJobRepository,
        UploadedAssetRepository,
        PrismaService,
    ],
})
export class UploadModule { }