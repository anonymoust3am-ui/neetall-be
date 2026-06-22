import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  CompleteProfileDto,
  UpdateProfileFieldsDto,
  UpdateEmailDto,
  EnableEmailLoginDto,
  UpdatePasswordDto,
  VerifyEmailForLoginDto,
  ResendEmailVerificationDto,
  UpsertFcmTokenDto,
  DeleteFcmTokenDto,
} from './dto/profile.dto';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * 📋 POST /profile/complete
   * Complete user profile during onboarding
   * Provide required info: name, state, city + optional fields
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeProfile(@Body() body: CompleteProfileDto, @Req() req: any) {
    return this.profileService.completeProfile(req.user.id, body);
  }

  /**
   * 👤 GET /profile
   * Get current user profile details
   */
  @Get()
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  /**
   * ✏️ PATCH /profile/update
   * Update individual or multiple profile fields
   */
  @Patch('update')
  async updateProfileFields(
    @Body() body: UpdateProfileFieldsDto,
    @Req() req: any,
  ) {
    return this.profileService.updateProfileFields(req.user.id, body);
  }

  /**
   * 📊 GET /profile/completion-status
   * Get profile completion percentage and missing fields
   */
  @Get('completion-status')
  async getProfileCompletionStatus(@Req() req: any) {
    return this.profileService.getProfileCompletionStatus(req.user.id);
  }

  /**
   * 📧 POST /profile/email/update
   * Update email address (sends OTP to new email)
   */
  @Post('email/update')
  @HttpCode(HttpStatus.OK)
  async updateEmail(@Body() body: UpdateEmailDto, @Req() req: any) {
    return this.profileService.updateEmail(req.user.id, body);
  }

  /**
   * ✅ POST /profile/email/verify
   * Verify new email with OTP code
   */
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() body: { email: string; code: string },
    @Req() req: any,
  ) {
    return this.profileService.verifyEmail(req.user.id, body.email, body.code);
  }

  /**
   * 🔓 POST /profile/email-login/enable
   * Enable email+password login for the account
   */
  @Post('email-login/enable')
  @HttpCode(HttpStatus.OK)
  async enableEmailLogin(@Body() body: EnableEmailLoginDto, @Req() req: any) {
    return this.profileService.enableEmailLogin(req.user.id, body);
  }

  /**
   * ✅ POST /profile/email-login/verify
   * Verify email for login with OTP
   */
  @Post('email-login/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailForLogin(
    @Body() body: VerifyEmailForLoginDto,
    @Req() req: any,
  ) {
    return this.profileService.verifyEmailForLogin(req.user.id, body);
  }

  /**
   * 🔄 POST /profile/email/resend-verification
   * Resend email verification OTP
   */
  @Post('email/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(
    @Body() body: ResendEmailVerificationDto,
    @Req() req: any,
  ) {
    return this.profileService.resendEmailVerification(req.user.id, body);
  }

  /**
   * 🔐 POST /profile/password/update
   * Update password (for email login users)
   */
  @Post('password/update')
  @HttpCode(HttpStatus.OK)
  async updatePassword(@Body() body: UpdatePasswordDto, @Req() req: any) {
    return this.profileService.updatePassword(req.user.id, body);
  }

  /**
   * 🔓 DELETE /profile/email-login/disable
   * Disable email login and remove password
   */
  @Delete('email-login/disable')
  async disableEmailLogin(@Req() req: any) {
    return this.profileService.disableEmailLogin(req.user.id);
  }

  /**
   * 📲 POST /profile/fcm-token
   * Register or update FCM token for the current user
   */
  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  async upsertFcmToken(@Body() body: UpsertFcmTokenDto, @Req() req: any) {
    return this.profileService.upsertFcmToken(req.user.id, body);
  }

  /**
   * 📲 DELETE /profile/fcm-token
   * Remove an FCM token (e.g. on logout)
   */
  @Delete('fcm-token')
  async deleteFcmToken(@Body() body: DeleteFcmTokenDto, @Req() req: any) {
    return this.profileService.deleteFcmToken(req.user.id, body.token);
  }
}

