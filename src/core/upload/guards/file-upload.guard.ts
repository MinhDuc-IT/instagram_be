import {
    Injectable,
    CanActivate,
    ExecutionContext,
    BadRequestException,
} from '@nestjs/common';

@Injectable()
export class FileUploadGuard implements CanActivate {
    constructor(private readonly allowedMimeTypes: string[]) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const file = request.file;

        if (!file) {
            throw new BadRequestException('File is required');
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
            );
        }

        return true;
    }
}