import {
    PipeTransform,
    Injectable,
    BadRequestException,
    ArgumentMetadata,
} from '@nestjs/common';

interface FileValidationOptions {
    maxSize: number;
    allowedTypes: string[];
    fileType: 'image' | 'video';
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
    constructor(private readonly options: FileValidationOptions) { }

    transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        // Validate file size
        if (file.size > this.options.maxSize) {
            throw new BadRequestException(
                `File size exceeds limit of ${this.options.maxSize / 1024 / 1024}MB`,
            );
        }

        // Validate file type
        if (!this.options.allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid ${this.options.fileType} type. Allowed types: ${this.options.allowedTypes.join(', ')}`,
            );
        }

        // Validate file buffer
        if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestException('File buffer is empty');
        }

        return file;
    }
}