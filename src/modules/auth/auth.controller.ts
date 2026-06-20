import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Headers,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import {
  LoginDto,
  UpdateProfileDto,
  SendEmailOtpDto,
  VerifyEmailOtpDto,
  LogoutDto,
  RemoteLogoutDto,
} from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 🔓 POST /auth/login
   * Login/Register with Firebase OTP
   *
   * Payload:
   * - deviceId: unique device identifier
   * - deviceType: mobile|tablet|desktop|web
   * - Optional: name, email, state, city, gender, category, dob
   *
   * Header:
   * - Authorization: Bearer <firebase-id-token>
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Headers('authorization') authHeader: string,
    @Body() body: LoginDto,
    @Req() req: any,
  ) {
    return this.authService.loginWithFirebase(
      authHeader,
      {
        deviceId: body.deviceId,
        deviceType: body.deviceType,
        deviceName: body.deviceName,
        ip: req.ip,
      },
      body,
    );
  }

  /**
   * 🚪 POST /auth/logout
   * Logout from current device
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Body() body: LogoutDto, @Req() req: any) {
    return this.authService.logout(req.user.id, body.deviceId);
  }

  /**
   * 🌐 POST /auth/logout-remote
   * Logout from other devices
   *
   * If deviceIds not provided: logout from ALL except current device
   */
  @Post('logout-remote')
  @UseGuards(AuthGuard)
  async remoteLogout(@Body() body: RemoteLogoutDto, @Req() req: any) {
    const currentDeviceId = req.headers['x-device-id'] || req.query.deviceId;
    return this.authService.remoteLogout(req.user.id, currentDeviceId, body);
  }

  /**
   * 📋 PATCH /auth/profile
   * Update user profile (progressive)
   *
   * Only updates provided fields
   * Non-destructive: never overwrites existing data
   */
  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Body() body: UpdateProfileDto, @Req() req: any) {
    return this.authService.updateProfile(req.user.id, body);
  }

  /**
   * 👤 GET /auth/me
   * Get current user profile
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  /**
   * 📱 GET /auth/sessions
   * Get all active sessions for user
   */
  @Get('sessions')
  @UseGuards(AuthGuard)
  async getSessions(@Req() req: any) {
    const currentDeviceId = req.headers['x-device-id'] || req.query.deviceId;
    return this.authService.getAllSessions(req.user.id, currentDeviceId);
  }

  /**
   * 📧 POST /auth/email/send-otp
   * Send email verification OTP
   */
  @Post('email/send-otp')
  @UseGuards(AuthGuard)
  async sendEmailOtp(@Body() body: SendEmailOtpDto, @Req() req: any) {
    return this.authService.sendEmailOtp(req.user.id, body);
  }

  /**
   * ✅ POST /auth/email/verify-otp
   * Verify email with OTP
   */
  @Post('email/verify-otp')
  @UseGuards(AuthGuard)
  async verifyEmailOtp(@Body() body: VerifyEmailOtpDto, @Req() req: any) {
    return this.authService.verifyEmailOtp(req.user.id, body);
  }
}
