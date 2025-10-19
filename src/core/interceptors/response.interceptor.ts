import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { RESPONSE_MESSAGE } from '../decorators/response.decorator';

export interface Response<T> {
  statusCode: number;
  message?: string;
  data: any;
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dto = this.reflector.get('transformResponseDto', context.getHandler());
    const message = this.reflector.get<string>(RESPONSE_MESSAGE, context.getHandler() || '');

    return next.handle().pipe(
      map((data) => {
        if (!dto) {
          return data;
        }

        data = Array.isArray(data)
          ? data.map((item) => plainToInstance(dto, item, { excludeExtraneousValues: true }))
          : plainToInstance(dto, data, { excludeExtraneousValues: true });
          
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message,
          data,
        };
      }),
    );
  }
}
