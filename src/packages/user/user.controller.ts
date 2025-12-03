import { Controller, Get, Param, NotFoundException, ParseIntPipe, Req } from "@nestjs/common";
import { UserService } from "./user.service";
import { TransformResponseDto, ResponseMessage } from "src/core/decorators/response.decorator";
import { GetUserDto } from "./dto/get-user.dto";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags('Users')
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) { }

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
}