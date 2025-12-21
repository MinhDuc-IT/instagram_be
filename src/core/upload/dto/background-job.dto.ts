import { ApiProperty } from '@nestjs/swagger';
import { UploadResponseDto } from './upload-response.dto';

export class BackgroundJobDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: ['image', 'video', 'mixed', 'story'] })
    type: 'image' | 'video' | 'mixed' | 'story';

    @ApiProperty()
    fileName: string;

    @ApiProperty({ enum: ['pending', 'processing', 'completed', 'failed'] })
    status: 'pending' | 'processing' | 'completed' | 'failed';

    @ApiProperty({ required: false })
    result?: UploadResponseDto;

    @ApiProperty({ required: false })
    error?: string;

    @ApiProperty()
    progress: number;

    @ApiProperty()
    createdDate: Date;

    @ApiProperty({ required: false })
    completedAt?: Date;

    @ApiProperty()
    retryCount: number;

    @ApiProperty()
    maxRetries: number;
}

export class JobStatusResponseDto {
    @ApiProperty()
    jobId: string;

    @ApiProperty()
    message: string;

    @ApiProperty()
    status: string;
}