import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApplyReferralDto } from './dto/referral.dto';

@Controller('referral')
@UseGuards(AuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ========================
  // 🎟️ REFERRAL CODE
  // ========================

  /**
   * GET /referral/my-code
   * Get or generate the authenticated user's referral code
   */
  @Get('my-code')
  async getMyCode(@Req() req: any) {
    return this.referralService.getOrGenerateReferralCode(req.user.id);
  }

  // ========================
  // 🔗 APPLY REFERRAL
  // ========================

  /**
   * POST /referral/apply
   * Apply a referral code (as the referred user)
   */
  @Post('apply')
  async applyCode(@Req() req: any, @Body() body: ApplyReferralDto) {
    return this.referralService.applyReferralCode(req.user.id, body.code);
  }

  // ========================
  // 📊 MY REFERRALS
  // ========================

  /**
   * GET /referral/my-referrals
   * List all users I've referred, with stats
   */
  @Get('my-referrals')
  async getMyReferrals(@Req() req: any) {
    return this.referralService.getMyReferrals(req.user.id);
  }

  /**
   * GET /referral/stats
   * Get referral statistics (lightweight)
   */
  @Get('stats')
  async getStats(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.id);
  }

  /**
   * GET /referral/my-referrer
   * Check who referred me (if anyone)
   */
  @Get('my-referrer')
  async getMyReferrer(@Req() req: any) {
    return this.referralService.getMyReferrer(req.user.id);
  }
}
