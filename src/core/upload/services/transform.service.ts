import { Injectable } from '@nestjs/common';
import { TransformOptionsDto } from '../dto/transform-options.dto';

@Injectable()
export class TransformService {
    private cloudName: string;

    constructor() {
        this.cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    }

    buildTransformString(options: TransformOptionsDto): string {
        const transforms: string[] = [];

        if (options.width || options.height) {
            if (options.width) transforms.push(`w_${options.width}`);
            if (options.height) transforms.push(`h_${options.height}`);
            transforms.push(`c_${options.crop || 'fill'}`);
        }

        if (options.quality) {
            transforms.push(`q_${options.quality}`);
        }

        if (options.fetchFormat) {
            transforms.push(`f_${options.fetchFormat}`);
        }

        if (options.dpr) {
            transforms.push(`dpr_${options.dpr}`);
        }

        if (options.gravity) {
            transforms.push(`g_${options.gravity}`);
        }

        if (options.radius !== undefined) {
            transforms.push(`r_${options.radius}`);
        }

        if (options.background) {
            transforms.push(`b_${options.background}`);
        }

        if (options.angle) {
            transforms.push(`a_${options.angle}`);
        }

        if (options.opacity) {
            transforms.push(`o_${options.opacity}`);
        }

        return transforms.join(',');
    }

    getTransformationUrl(publicId: string, options?: TransformOptionsDto): string {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
        const transforms = options ? this.buildTransformString(options) : '';
        return `${baseUrl}/${transforms}/v1/${publicId}`.replace(/\/\//g, '/').replace(':/', '://');
    }

    getResponsiveUrls(publicId: string, baseOptions?: TransformOptionsDto) {
        return {
            mobile: this.getTransformationUrl(publicId, {
                ...baseOptions,
                width: 480,
                height: 360,
                fetchFormat: 'auto',
                quality: 'auto',
            }),
            tablet: this.getTransformationUrl(publicId, {
                ...baseOptions,
                width: 800,
                height: 600,
                fetchFormat: 'auto',
                quality: 'auto',
            }),
            desktop: this.getTransformationUrl(publicId, {
                ...baseOptions,
                width: 1200,
                height: 800,
                fetchFormat: 'auto',
                quality: 'auto',
            }),
            original: this.getTransformationUrl(publicId, {
                ...baseOptions,
                fetchFormat: 'auto',
                quality: 'auto',
            }),
        };
    }

    getThumbnail(publicId: string, size: number = 200): string {
        return this.getTransformationUrl(publicId, {
            width: size,
            height: size,
            crop: 'thumb',
            gravity: 'faces',
            quality: 'auto',
            fetchFormat: 'auto',
        });
    }

    getAvatar(publicId: string, size: number = 100): string {
        return this.getTransformationUrl(publicId, {
            width: size,
            height: size,
            crop: 'fill',
            gravity: 'face',
            radius: 'max',
            background: 'auto',
            quality: 'auto',
            fetchFormat: 'auto',
        });
    }

    getVideoThumbnail(publicId: string, width: number = 400): string {
        return this.getTransformationUrl(publicId, {
            width,
            height: 300,
            crop: 'fill',
            quality: 'auto',
            fetchFormat: 'auto',
        });
    }
}