import {
    Body,
    Controller,
    HttpCode,
    Get,
    Request,
    Post,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
    Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from 'nestjs-zod';
import {
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { TransformResponseInterceptor } from 'src/core/interceptors/response.interceptor';
import { LoginResponseDto, LoginUserDto } from './dto/login.dto';
import { TransformResponseDto } from 'src/core/decorators/response.decorator';
import { RegisterUserDto, RegisterResponseDto } from './dto/register.dto';
import { ResendVerificationDto, ResendVerificationResponseDto } from './dto/resend-verification.dto';
import { AuthService } from "./auth.service";
import { Public } from '../decorators/response.decorator';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import {
    VerifyAccountDto,
    VerifyAccountResponseDto,
} from './dto/verify-account.dto';

@ApiTags('Authentication')
@UseGuards(JwtAuthGuard)
@Controller('auth')
@UseInterceptors(TransformResponseInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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

  @Get('facebook')
  @Public()
  @UseGuards(FacebookAuthGuard)
  async facebookLogin() {}

  @Get('facebook/callback')
  @Public()
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req, @Res() res: Response) {
    const clientMetadata = {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      deviceName: this.deriveDeviceName(req.headers['user-agent'] || ''),
    };
    const user = await this.authService.upsertUserSocialMedia(
      req.user,
      clientMetadata,
    );
    const FE_URL = this.configService.get<string>('FRONTEND_URL');
    return res.redirect(`${FE_URL}/code/${user?.id}/${user?.loginToken}`);
  }

  @Get('checkTokenLogin')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Check token login validity' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async checkTokenLogin(
    @Query('userId') userId: string,
    @Query('tokenLogin') tokenLogin: string,
    @Req() req: Request,
  ) {
    const clientMetadata = {
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      deviceName: this.deriveDeviceName(req.headers['user-agent'] || ''),
    };
    return this.authService.checkTokenLogin(
      Number(userId),
      tokenLogin,
      clientMetadata,
    );
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Logout current device' })
  @ApiResponse({ status: 204, description: 'Successfully logged out' })
  async logout(@Req() request: any) {
    const { id, deviceId } = request.user;
    await this.authService.logout(id, deviceId);
    return;
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: ResendVerificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  @TransformResponseDto(ResendVerificationResponseDto)
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendDto.email);
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
