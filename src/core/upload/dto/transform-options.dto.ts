// import { ApiProperty } from '@nestjs/swagger';
// import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';

// export class TransformOptionsDto {
//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsNumber()
//     width?: number;

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsNumber()
//     height?: number;

//     @ApiProperty({ required: false, enum: ['fill', 'fit', 'crop', 'thumb', 'scale'] })
//     @IsOptional()
//     @IsEnum(['fill', 'fit', 'crop', 'thumb', 'scale'])
//     crop?: 'fill' | 'fit' | 'crop' | 'thumb' | 'scale';

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsString()
//     gravity?: string;

//     @ApiProperty({ required: false })
//     @IsOptional()
//     quality?: number | 'auto';

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsString()
//     format?: string;

//     @ApiProperty({ required: false, enum: ['auto', 'jpg', 'png', 'webp'] })
//     @IsOptional()
//     @IsEnum(['auto', 'jpg', 'png', 'webp'])
//     fetchFormat?: 'auto' | 'jpg' | 'png' | 'webp';

//     @ApiProperty({ required: false })
//     @IsOptional()
//     dpr?: 'auto' | number;

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsNumber()
//     angle?: number;

//     @ApiProperty({ required: false })
//     @IsOptional()
//     radius?: number | 'max';

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsString()
//     background?: string;

//     @ApiProperty({ required: false })
//     @IsOptional()
//     @IsNumber()
//     opacity?: number;
// }

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';

export class TransformOptionsDto {
    @ApiProperty({
        required: false,
        description: 'Chiều rộng mong muốn của ảnh hoặc video sau khi transform (tính bằng pixel).',
        example: 300,
    })
    @IsOptional()
    @IsNumber()
    width?: number;

    @ApiProperty({
        required: false,
        description: 'Chiều cao mong muốn của ảnh hoặc video sau khi transform (tính bằng pixel).',
        example: 300,
    })
    @IsOptional()
    @IsNumber()
    height?: number;

    @ApiProperty({
        required: false,
        enum: ['fill', 'fit', 'crop', 'thumb', 'scale'],
        description:
            'Chế độ cắt hoặc co dãn ảnh:\n' +
            '- `fill`: Cắt ảnh để vừa khung.\n' +
            '- `fit`: Giữ nguyên tỉ lệ, ảnh nằm gọn trong khung.\n' +
            '- `crop`: Cắt ảnh theo kích thước chỉ định.\n' +
            '- `thumb`: Cắt và focus khuôn mặt hoặc vùng chính.\n' +
            '- `scale`: Co dãn ảnh mà không cắt.',
        example: 'fill',
    })
    @IsOptional()
    @IsEnum(['fill', 'fit', 'crop', 'thumb', 'scale'])
    crop?: 'fill' | 'fit' | 'crop' | 'thumb' | 'scale';

    @ApiProperty({
        required: false,
        description: 'Xác định vùng focus (gravity) khi cắt ảnh, ví dụ: `center`, `face`, `north`, `south`, ...',
        example: 'center',
    })
    @IsOptional()
    @IsString()
    gravity?: string;

    @ApiProperty({
        required: false,
        description: 'Chất lượng hình ảnh sau khi transform. Có thể là số (0–100) hoặc `auto` để tự động tối ưu.',
        example: 'auto',
    })
    @IsOptional()
    quality?: number | 'auto';

    @ApiProperty({
        required: false,
        description: 'Định dạng đầu ra mong muốn, ví dụ: `jpg`, `png`, `webp`...',
        example: 'webp',
    })
    @IsOptional()
    @IsString()
    format?: string;

    @ApiProperty({
        required: false,
        enum: ['auto', 'jpg', 'png', 'webp'],
        description:
            'Định dạng file trả về từ Cloudinary:\n' +
            '- `auto`: để Cloudinary tự chọn định dạng tối ưu.\n' +
            '- `jpg`, `png`, `webp`: định dạng cố định.',
        example: 'auto',
    })
    @IsOptional()
    @IsEnum(['auto', 'jpg', 'png', 'webp'])
    fetchFormat?: 'auto' | 'jpg' | 'png' | 'webp';

    @ApiProperty({
        required: false,
        description: 'Tỷ lệ pixel density (DPR). Dùng `auto` để tự động xác định theo thiết bị.',
        example: 'auto',
    })
    @IsOptional()
    dpr?: 'auto' | number;

    @ApiProperty({
        required: false,
        description: 'Góc xoay của ảnh (độ).',
        example: 90,
    })
    @IsOptional()
    @IsNumber()
    angle?: number;

    @ApiProperty({
        required: false,
        description: 'Bo góc ảnh (px) hoặc `max` để tạo ảnh tròn.',
        example: 'max',
    })
    @IsOptional()
    radius?: number | 'max';

    @ApiProperty({
        required: false,
        description: 'Màu nền dùng khi transform ảnh, ví dụ: `white`, `black`, hoặc mã HEX như `#ffffff`.',
        example: 'white',
    })
    @IsOptional()
    @IsString()
    background?: string;

    @ApiProperty({
        required: false,
        description: 'Độ mờ của ảnh (0 đến 100).',
        example: 80,
    })
    @IsOptional()
    @IsNumber()
    opacity?: number;
}
