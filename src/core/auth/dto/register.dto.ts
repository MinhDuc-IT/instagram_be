import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RegisterUserSchema = z.object({
  username: z
    .string( 'Username is required' )
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(20, { message: 'Username must not exceed 20 characters' }),

  email: z
    .string( 'Email is required' )
    .email({ message: 'Please enter a valid email address' }),

  fullname: z
    .string( 'Full name is required' )
    .min(3, { message: 'Full name must be at least 3 characters' })
    .max(100, { message: 'Full name must not exceed 100 characters' }),

  password: z
    .string( 'Password is required' )
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      {
        message:
          'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
      }
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
    description: 'The fullname of the user',
    example: 'John Doe',
    required: true,
    minLength: 3,
    format: 'password',
  })
  password: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'john doe',
    required: true,
    minLength: 3,
    maxLength: 20,
  })
  fullname: string;
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
