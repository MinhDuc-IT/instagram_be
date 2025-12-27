import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { GetUser } from '../../core/auth/decorators/get-user.decorator';
import {
  FollowQueryDto,
  FollowActionResponseDto,
  FollowStatsDto,
  FollowStatusDto,
  UserProfileWithStatsDto,
} from './dto';

@ApiTags('Follow')
@Controller('follow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow or unfollow a user (toggle)' })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'ID of the user to follow/unfollow',
  })
  @ApiResponse({
    status: 200,
    description: 'Follow action completed successfully',
    type: FollowActionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot follow yourself',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleFollow(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<FollowActionResponseDto> {
    return this.followService.toggleFollow(currentUserId, targetUserId);
  }

  //   @Delete(':userId')
  //   @HttpCode(HttpStatus.OK)
  //   @ApiOperation({ summary: 'Unfollow a user (explicit)' })
  //   @ApiParam({
  //     name: 'userId',
  //     type: 'number',
  //     description: 'ID of the user to unfollow',
  //   })
  //   @ApiResponse({ status: 200, description: 'Unfollowed successfully' })
  //   async unfollow(
  //     @GetUser('id') currentUserId: number,
  //     @Param('userId', ParseIntPipe) targetUserId: number,
  //   ): Promise<FollowActionResponseDto> {
  //     return this.followService.toggleFollow(currentUserId, targetUserId);
  //   }

  @Get('followers/:userId')
  @ApiOperation({ summary: 'Get followers list of a user' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID of the user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by username or fullname',
  })
  @ApiResponse({
    status: 200,
    description: 'Followers list retrieved successfully',
  })
  async getFollowers(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowers(userId, query, currentUserId);
  }

  @Get('following/:userId')
  @ApiOperation({ summary: 'Get following list of a user' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID of the user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by username or fullname',
  })
  @ApiResponse({
    status: 200,
    description: 'Following list retrieved successfully',
  })
  async getFollowing(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowing(userId, query, currentUserId);
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get follow statistics of a user' })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID of the user' })
  @ApiResponse({
    status: 200,
    description: 'Follow stats retrieved successfully',
    type: FollowStatsDto,
  })
  async getFollowStats(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<FollowStatsDto> {
    return this.followService.getFollowStats(userId);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Check follow status with a user' })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'ID of the target user',
  })
  @ApiResponse({
    status: 200,
    description: 'Follow status retrieved successfully',
    type: FollowStatusDto,
  })
  async getFollowStatus(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<FollowStatusDto> {
    return this.followService.getFollowStatus(currentUserId, targetUserId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get suggested users to follow' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Suggested users retrieved successfully',
  })
  async getSuggestedUsers(
    @GetUser('id') currentUserId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.followService.getSuggestedUsers(currentUserId, limit);
  }

  @Get('mutual/:userId')
  @ApiOperation({ summary: 'Get mutual followers with another user' })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'ID of the target user',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Mutual followers retrieved successfully',
  })
  async getMutualFollowers(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.followService.getMutualFollowers(
      currentUserId,
      targetUserId,
      limit,
    );
  }

  @Delete('follower/:followerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a follower' })
  @ApiParam({
    name: 'followerId',
    type: 'number',
    description: 'ID of the follower to remove',
  })
  @ApiResponse({ status: 200, description: 'Follower removed successfully' })
  async removeFollower(
    @GetUser('id') currentUserId: number,
    @Param('followerId', ParseIntPipe) followerId: number,
  ): Promise<FollowActionResponseDto> {
    return this.followService.removeFollower(currentUserId, followerId);
  }

  @Get('profile/:userId')
  @ApiOperation({
    summary: 'Get user profile with follow statistics',
    description:
      'Get detailed user profile including followers count, following count, posts count, and follow status',
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'ID of the user' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileWithStatsDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(
    @GetUser('id') currentUserId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UserProfileWithStatsDto> {
    return this.followService.getUserProfile(userId, currentUserId);
  }
}
