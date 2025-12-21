import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoryDto {
    @ApiPropertyOptional({
        description: 'Caption của story (optional)',
        example: 'Good morning ☀️',
    })
    caption?: string;
}
