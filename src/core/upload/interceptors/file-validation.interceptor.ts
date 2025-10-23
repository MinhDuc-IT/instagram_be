import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const startTime = Date.now();

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                request.uploadMetadata = {
                    duration,
                    timestamp: new Date(),
                };
            }),
        );
    }
}
