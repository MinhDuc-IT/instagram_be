import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export class ResendVerificationDto extends createZodDto(
  ResendVerificationSchema,
) {
  @ApiProperty({ example: 'user@example.com' })
  email: string;
}

export class ResendVerificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Verification email has been sent' })
  message: string;
}
