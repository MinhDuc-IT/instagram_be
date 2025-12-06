import {
    Controller,
    Get,
    Param,
    NotFoundException,
    ParseIntPipe,
    Req,
    Post,
    HttpCode,
    HttpStatus,
    BadRequestException,
    UseGuards,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { FollowService } from "./follow.service";
import { TransformResponseDto, ResponseMessage } from "src/core/decorators/response.decorator";
import { GetUserDto } from "./dto/get-user.dto";
import { FollowToggleResponse } from "./dto/follow.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/core/guards/jwt-auth.guard";
import { Patch, Body } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('Users')
@Controller("users")
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly followService: FollowService,
    ) { }

    @Get()
    findAll() {
        return this.userService.getAllUsers();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin chi tiết user' })
    @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @TransformResponseDto(GetUserDto)
    @ResponseMessage('User retrieved successfully')
    async getUserProfile(
        @Param('id', ParseIntPipe) userId: number,
        @Req() req: any
    ) {
        const currentUserId = req.user?.id;
        const user = await this.userService.getUserProfile(userId, currentUserId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    @Post(':userId/follow')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Toggle follow/unfollow user' })
    @ApiResponse({ status: 200, description: 'Follow toggled successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 400, description: 'Bad request (cannot follow yourself)' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @TransformResponseDto(FollowToggleResponse)
    @ResponseMessage('Toggled follow')
    async toggleFollow(
        @Param('userId', ParseIntPipe) targetUserId: number,
        @Req() req: any,
    ) {
        const followerUserId = req.user?.id;
        if (!followerUserId) {
            throw new BadRequestException('User not found in token');
        }

        return await this.followService.toggleFollow(targetUserId, followerUserId);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật profile của user đăng nhập' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiBody({ type: UpdateUserDto })
    async updateMyProfile(@Body() dto: UpdateUserDto, @Req() req: any) {
        const userId = req.user?.id;
        if (!userId) throw new BadRequestException('User not found in token');

        const updated = await this.userService.updateProfile(userId, dto as any);
        return updated;
    }
}