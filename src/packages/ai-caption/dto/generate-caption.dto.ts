import { IsNotEmpty, IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CaptionLanguage {
    VI = 'vi',
    EN = 'en',
}

export enum CaptionIntent {
    BRANDING = 'branding',
    SELL = 'sell',
    VIRAL = 'viral',
    STORY = 'story',
}

export enum CaptionTone {
    NATURAL = 'natural',
    GENZ = 'genz',
    PROFESSIONAL = 'professional',
    EMOTIONAL = 'emotional',
}

export class GenerateCaptionDto {
    @ApiProperty({
        description: 'Description of the desired caption content or post context',
        example: 'Một buổi chiều yên tĩnh, ngồi bên cửa sổ với ánh nắng nhẹ',
    })
    @IsNotEmpty()
    @IsString()
    userDescription: string;

    @ApiPropertyOptional({
        description: 'Target language for the caption',
        enum: CaptionLanguage,
        default: CaptionLanguage.VI,
    })
    @IsOptional()
    @IsEnum(CaptionLanguage)
    language?: CaptionLanguage = CaptionLanguage.VI;

    @ApiPropertyOptional({
        description: 'The primary intent of the post',
        enum: CaptionIntent,
        default: CaptionIntent.BRANDING,
    })
    @IsOptional()
    @IsEnum(CaptionIntent)
    intent?: CaptionIntent = CaptionIntent.BRANDING;

    @ApiPropertyOptional({
        description: 'The desired tone of voice',
        enum: CaptionTone,
        default: CaptionTone.NATURAL,
    })
    @IsOptional()
    @IsEnum(CaptionTone)
    tone?: CaptionTone = CaptionTone.NATURAL;

    @ApiPropertyOptional({
        description: 'Optional brand style or specific keywords to include',
        example: 'Minimalist and calm',
    })
    @IsOptional()
    @IsString()
    brandStyle?: string;

    @ApiPropertyOptional({
        description: 'Number of caption variants to generate',
        minimum: 1,
        maximum: 5,
        default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    maxVariants?: number = 3;
}
