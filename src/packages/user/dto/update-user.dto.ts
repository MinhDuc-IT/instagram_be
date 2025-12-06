import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsUrl } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'Full name' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    @IsOptional()
    @IsUrl()
    avatar?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ description: 'Gender (0/1/2 or similar)' })
    @IsOptional()
    @IsInt()
    gender?: number;
}
