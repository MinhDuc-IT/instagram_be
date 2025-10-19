import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const VerifyAccountSchema = z.object({
  token: z.string().min(32, 'Invalid verification token'),
});

export class VerifyAccountDto extends createZodDto(VerifyAccountSchema) {
  @ApiProperty({
    example: '7a28c105e7b6f8b2a41c84f35b29d3a1b950d997e7d937a86f784dcb929c8e54',
    description: 'Verification token from email',
  })
  token: string;
}

export class VerifyAccountResponseDto {
  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ example: 'Account successfully verified' })
  message: string;
}
