import { Expose, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetReelDto {
  @Expose()
  @ApiPropertyOptional({
    description:
      'Cursor ID để phân trang. Truyền lastReelId để load trang tiếp theo.',
    example: 'clrqz1fc5000xyz12abc',
  })
  cursor?: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'Số lượng reel cần lấy (mặc định 10)',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  limit?: number;
}
