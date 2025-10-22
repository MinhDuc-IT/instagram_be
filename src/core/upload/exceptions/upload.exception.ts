import { HttpException, HttpStatus } from '@nestjs/common';

export class UploadException extends HttpException {
    constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
        super(
            {
                success: false,
                error: message,
                timestamp: new Date().toISOString(),
            },
            status,
        );
    }
}