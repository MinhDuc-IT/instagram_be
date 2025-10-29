import { ConfigService } from '@nestjs/config';

export const cloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: async (configService: ConfigService) => {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get('CLOUDINARY_API_KEY'),
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
    return cloudinary;
  },
  inject: [ConfigService],
};