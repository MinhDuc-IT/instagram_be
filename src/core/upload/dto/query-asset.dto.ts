import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAssetDto {
    @ApiProperty({ required: false, enum: ['image', 'video'] })
    @IsOptional()
    @IsEnum(['image', 'video'])
    type?: 'image' | 'video';

    @ApiProperty({ required: false, default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    skip?: number = 0;

    @ApiProperty({ required: false, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    take?: number = 10;
}