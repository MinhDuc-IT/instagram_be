import { Controller, Get, Query, HttpCode, HttpStatus, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { ReelsService } from './reels.service';
import { GetReelDto } from './dto/get-reel.dto';
import { ReelsPaginationResponseDto } from './dto/reel-response.dto';

@ApiTags('Reels')
@ApiBearerAuth()
@Controller('reels')
// @UseGuards(JwtAuthGuard)
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get("get-reels-pagination")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Reels with cursor-based pagination' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Successfully retrieved reels',
    type: ReelsPaginationResponseDto,
  })
  async getReelsPagination(
    @Query() query: GetReelDto,
    @Req() req: Request,
  ): Promise<ReelsPaginationResponseDto> {
    const limit = Number(query.limit) || 10;
    const userId = req.user?.['userId'];
    return this.reelsService.getReelsPagination(limit, query.cursor, userId);
  }
}
