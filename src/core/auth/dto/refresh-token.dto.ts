import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {
    @ApiProperty({ example: 'your-refresh-token-here' })
    refreshToken: string;
}
