import { Injectable, BadRequestException } from '@nestjs/common';
import { ReelsRepository } from "./reels.repository";
import { ReelsPaginationResponseDto } from './dto/reel-response.dto';

@Injectable()
export class ReelsService {
  constructor(private readonly reelsRepository: ReelsRepository) {}

  async getReelsPagination(
    limit: number,
    cursor?: string,
    userId?: number,
  ): Promise<ReelsPaginationResponseDto> {
    if (limit <= 0) {
      throw new BadRequestException('Limit must be greater than 0');
    }
    return this.reelsRepository.findReelsPagination(limit, cursor, userId);
  }
}