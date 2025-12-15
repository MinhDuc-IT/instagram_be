import {
    PipeTransform,
    Injectable,
    BadRequestException,
    ArgumentMetadata,
} from '@nestjs/common';

interface FileValidationOptions {
    maxSize: number;
    allowedTypes: string[];
    fileType: 'image' | 'video' | 'mixed';
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
    constructor(private readonly options: FileValidationOptions) {}

    transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const isDiskStorage = !!file.path;
        const size = file.size ?? file.buffer?.length ?? 0;

        // 1) Check size
        if (size > this.options.maxSize) {
            throw new BadRequestException(
                `File size exceeds ${this.options.maxSize / 1024 / 1024}MB`
            );
        }

        if (size === 0) {
            throw new BadRequestException('File is empty');
        }

        // 2) Check mimetype
        if (!this.options.allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid ${this.options.fileType} type. Allowed: ${this.options.allowedTypes.join(', ')}`
            );
        }

        // 3) Check buffer only when using memoryStorage
        if (!isDiskStorage && (!file.buffer || file.buffer.length === 0)) {
            throw new BadRequestException(
                'File buffer is empty (memoryStorage mode expected buffer)'
            );
        }

        return file;
    }
}
