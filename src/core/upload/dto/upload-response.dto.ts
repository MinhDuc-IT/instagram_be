import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  id: string | null;

  @ApiProperty()
  type: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  secureUrl: string;

  @ApiProperty()
  format: string;

  @ApiProperty({ required: false })
  width?: number;

  @ApiProperty({ required: false })
  height?: number;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty()
  fileSize: number;

  @ApiProperty({ required: false })
  transformUrl?: string;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  timestamp: Date;
}