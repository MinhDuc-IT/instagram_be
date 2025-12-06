// src/modules/auth/dto/login.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const LoginUserSchema = z.object({
  credential: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginUserDto extends createZodDto(LoginUserSchema) {
  @ApiProperty({
    description: 'Email or username of the user',
    example: 'john_doe2',
    required: true,
    minLength: 1,
  })
  credential: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'Password123!',
    required: true,
    minLength: 1,
  })
  password: string;
}

export class LoginResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  fullName: string;

  @Expose()
  gender: boolean;

  @Expose()
  phone: string;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  avatar: string;
}
