import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegisterUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
});

export interface ClientMetadata {
  ipAddress: string;
  userAgent: string;
  deviceName: string;
}

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {
  @ApiProperty({
    description: 'The username of the user',
    example: 'john_doe',
    required: true,
    minLength: 3,
    maxLength: 20,
  })
  username: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'john.doe@example.com',
    required: true,
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'Password123!',
    required: true,
    minLength: 8,
    format: 'password',
  })
  password: string;
}

export class RegisterResponseDto {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  expiresAt: Date;
}
