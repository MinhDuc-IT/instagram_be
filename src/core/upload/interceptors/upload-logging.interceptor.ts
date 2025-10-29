import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class UploadLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('UploadRequest');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const startTime = Date.now();

        const file = request.file;
        const fileName = file?.originalname || 'unknown';
        const fileSize = file?.size || 0;

        this.logger.log(
            `[${method}] ${url} - File: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`,
        );

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - startTime;
                this.logger.log(
                    `[${method}] ${url} - Completed in ${duration}ms`,
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                this.logger.error(
                    `[${method}] ${url} - Failed in ${duration}ms: ${error.message}`,
                );
                throw error;
            }),
        );
    }
}