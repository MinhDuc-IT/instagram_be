import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileSizePipe implements PipeTransform {
    constructor(private readonly maxSize: number) { }

    transform(file: Express.Multer.File) {
        if (file && file.size > this.maxSize) {
            throw new BadRequestException(
                `File size exceeds limit of ${this.maxSize / 1024 / 1024}MB`,
            );
        }
        return file;
    }
}