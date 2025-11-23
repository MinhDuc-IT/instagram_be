import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { UploadController } from './controllers/upload.controller';
import { AssetController } from './controllers/asset.controller';
import { CloudinaryService } from './services/cloudinary.service';
import { TransformService } from './services/transform.service';
import { UploadAssetService } from './services/upload-asset.service';
import { UploadProcessor } from './processors/upload.processor';
import { BackgroundJobRepository } from './repositories/background-job.repository';
import { PrismaService } from '../prisma/prisma.service';
import { cloudinaryProvider } from '../../config/cloudinary.config';
import { getBullConfig } from '../../config/bull.config';
import { UPLOAD_CONSTANTS } from './constants/upload.constants';
import { CleanupService } from './services/cleanup-job.service';

@Module({
    imports: [
        ConfigModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getBullConfig,
        }),
        BullModule.registerQueue({
            name: UPLOAD_CONSTANTS.QUEUE_NAME,
        }),
    ],
    controllers: [UploadController, AssetController],
    providers: [
        cloudinaryProvider,
        CloudinaryService,
        TransformService,
        UploadAssetService,
        UploadProcessor,
        BackgroundJobRepository,
        PrismaService,
        CleanupService
    ],
    exports: [
        CloudinaryService,
        TransformService,
        UploadAssetService,
        BackgroundJobRepository,
    ],
})
export class UploadModule { }