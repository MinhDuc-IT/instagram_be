export class UploadResponseDto {
  success: boolean;
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  transformUrl?: string;
  error?: string;
  timestamp: Date;
}