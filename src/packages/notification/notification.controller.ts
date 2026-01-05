import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { NotificationDto } from './dto/notification.dto';
import {
  TransformResponseDto,
  ResponseMessage,
} from '../../core/decorators/response.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách notifications thành công',
  })
  // Không dùng TransformResponseDto vì response là object có notifications array, không phải NotificationDto đơn lẻ
  @ResponseMessage('Lấy danh sách notifications thành công')
  async getNotifications(
    @Req() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return await this.notificationService.getNotifications(
      userId,
      limit || 20,
      offset || 0,
    );
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Đánh dấu notification là đã đọc' })
  @ApiResponse({ status: 200, description: 'Đánh dấu đã đọc thành công' })
  @TransformResponseDto(NotificationDto)
  @ResponseMessage('Đánh dấu đã đọc thành công')
  async markAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return await this.notificationService.markAsRead(notificationId, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả notifications là đã đọc' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu tất cả đã đọc thành công',
  })
  @ResponseMessage('Đánh dấu tất cả đã đọc thành công')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not found in token');
    }
    return await this.notificationService.markAllAsRead(userId);
  }
}
