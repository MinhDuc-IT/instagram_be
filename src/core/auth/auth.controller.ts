import {
    Body,
    Controller,
    HttpCode,
    Patch,
    Get,
    Request,
    Post,
    Req,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import {
    ApiCookieAuth,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/core/interceptors/response.interceptor';
import { LoginResponseDto, LoginUserDto } from './dto/login.dto';
import { TransformResponseDto } from 'src/core/decorators/response.decorator';
import { RegisterUserDto, RegisterResponseDto } from './dto/register.dto';
import { AuthService } from "./auth.service";
import { Public } from '../decorators/response.decorator';
import {
    VerifyAccountDto,
    VerifyAccountResponseDto,
} from './dto/verify-account.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(TransformResponseInterceptor)
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(200)
    @Public()
    @ApiOperation({ summary: 'Authenticate user and generate tokens' })
    @TransformResponseDto(LoginResponseDto)
    async login(
        @Body(new ZodValidationPipe(LoginUserDto)) dto: LoginUserDto,
        @Req() req: Request,
    ) {
        // Extract trusted metadata from request context
        const clientMetadata = {
            ipAddress: this.extractIpAddress(req),
            userAgent: req.headers['user-agent'] || 'Unknown',
            deviceName: this.deriveDeviceName(req.headers['user-agent'] || ''),
        };

        return this.authService.login(dto, clientMetadata);
    }

    @Post('register')
    @HttpCode(201)
    @Public()
    @ApiOperation({ summary: 'Register a new user account' })
    @TransformResponseDto(RegisterResponseDto)
    async register(
        @Body(new ZodValidationPipe(RegisterUserDto)) dto: RegisterUserDto,
        @Req() req: Request,
    ) {
        // Extract metadata from trusted request context
        const clientMetadata = {
            ipAddress: this.extractIpAddress(req),
            userAgent: req.headers['user-agent'] || 'Unknown',
            deviceName: this.deriveDeviceName(req.headers['user-agent'] || ''),
        };

        return this.authService.register(dto, clientMetadata);
    }

    @Post('logout')
    @HttpCode(204)
    @ApiOperation({ summary: 'Logout current device' })
    @ApiResponse({ status: 204, description: 'Successfully logged out' })
    async logout(@Req() request: any) {
        const { userId, deviceId } = request.user;
        await this.authService.logout(userId, deviceId);
        return;
    }

    @Post('verify')
    @HttpCode(200)
    @Public()
    @ApiOperation({ summary: 'Verify user account using token' })
    @ApiResponse({
        status: 200,
        description: 'Account verification successful',
        type: VerifyAccountResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid or expired verification token',
    })
    @TransformResponseDto(VerifyAccountResponseDto)
    async verifyAccount(@Body() verifyDto: VerifyAccountDto) {
        return this.authService.verifyAccount(verifyDto.token);
    }

    // IP extraction with proxy awareness
    private extractIpAddress(request: Request): string {
        return (
            request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
            (request as any).connection.remoteAddress ||
            '0.0.0.0'
        );
    }

    // Device name derivation logic
    private deriveDeviceName(userAgent: string): string {
        // Extract meaningful device identifiers from user agent
        const deviceMatches = /\(([^)]+)\)/.exec(userAgent);
        return deviceMatches
            ? deviceMatches[1].split(';')[0].trim()
            : 'Unknown Device';
    }
}
