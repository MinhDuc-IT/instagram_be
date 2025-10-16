import { SetMetadata } from '@nestjs/common';

export const TransformResponseDto = <T>(dto: T) =>
  SetMetadata('transformResponseDto', dto);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE, message);