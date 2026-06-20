import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReferralCodeResponseDto,
  ReferredUserResponseDto,
  ReferralStatsResponseDto,
  ReferralListResponseDto,
} from './dto/referral.dto';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // 🎟️ REFERRAL CODE
  // ========================

  /**
   * Get or generate user's referral code
   * If user already has one, return it. Otherwise generate a new one.
   */
  async getOrGenerateReferralCode(
    userId: string,
  ): Promise<ReferralCodeResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let code = user.refralCode;

    if (!code) {
      // Generate a unique 8-char alphanumeric code
      code = await this.generateUniqueCode();

      await this.prisma.user.update({
        where: { id: userId },
        data: { refralCode: code },
      });
    }

    return {
      referralCode: code,
      referralLink: `https://neetall.com/refer/${code}`,
    };
  }

  // ========================
  // 🔗 APPLY REFERRAL
  // ========================

  /**
   * Apply a referral code (called by the referred user)
   * - Validates the code exists and belongs to another user
   * - Prevents self-referral
   * - Prevents duplicate referral (user can only be referred once)
   */
  async applyReferralCode(
    userId: string,
    code: string,
  ): Promise<{ message: string; referredBy: string }> {
    // Find the referrer by their code
    const referrer = await this.prisma.user.findUnique({
      where: { refralCode: code },
    });

    if (!referrer) {
      throw new NotFoundException('Invalid referral code');
    }

    // Prevent self-referral
    if (referrer.id === userId) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    // Check if this user was already referred by someone
    const alreadyReferred = await this.prisma.refredUser.findFirst({
      where: { referredUserId: userId },
    });
    if (alreadyReferred) {
      throw new ConflictException('You have already used a referral code');
    }

    // Get the referred user's info
    const referredUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!referredUser) {
      throw new NotFoundException('User not found');
    }

    // Create the referral record
    await this.prisma.refredUser.create({
      data: {
        userId: referrer.id, // the referrer
        referredUserId: userId, // the person being referred
        referredName: referredUser.name,
        referredPhone: referredUser.phone,
      },
    });

    // Update referred user's RefSource
    await this.prisma.user.update({
      where: { id: userId },
      data: { RefSource: 'referral' },
    });

    return {
      message: 'Referral code applied successfully',
      referredBy: referrer.name || referrer.phone,
    };
  }

  // ========================
  // 📊 MY REFERRALS
  // ========================

  /**
   * Get all users referred by the authenticated user
   */
  async getMyReferrals(userId: string): Promise<ReferralListResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referrals = await this.prisma.refredUser.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const referredUsers: ReferredUserResponseDto[] = referrals.map((r) => ({
      id: r.id,
      referredName: r.referredName,
      referredPhone: r.referredPhone ? this.maskPhone(r.referredPhone) : null,
      isRewarded: r.isRewarded,
      createdAt: r.createdAt,
    }));

    const rewardedCount = referrals.filter((r) => r.isRewarded).length;

    return {
      referrals: referredUsers,
      total: referrals.length,
      stats: {
        referralCode: user.refralCode,
        totalReferrals: referrals.length,
        rewardedReferrals: rewardedCount,
        pendingReferrals: referrals.length - rewardedCount,
      },
    };
  }

  /**
   * Get referral stats only (lightweight)
   */
  async getReferralStats(userId: string): Promise<ReferralStatsResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const total = await this.prisma.refredUser.count({
      where: { userId },
    });

    const rewarded = await this.prisma.refredUser.count({
      where: { userId, isRewarded: true },
    });

    return {
      referralCode: user.refralCode,
      totalReferrals: total,
      rewardedReferrals: rewarded,
      pendingReferrals: total - rewarded,
    };
  }

  /**
   * Check who referred the current user (if anyone)
   */
  async getMyReferrer(
    userId: string,
  ): Promise<{ referredBy: string | null; appliedAt: Date | null }> {
    const record = await this.prisma.refredUser.findFirst({
      where: { referredUserId: userId },
      include: { user: { select: { name: true, phone: true } } },
    });

    if (!record) {
      return { referredBy: null, appliedAt: null };
    }

    return {
      referredBy: record.user.name || this.maskPhone(record.user.phone),
      appliedAt: record.createdAt,
    };
  }

  // ========================
  // 🛠️ HELPERS
  // ========================

  /**
   * Generate a unique 8-char uppercase alphanumeric referral code
   */
  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code: string;
    let exists: boolean;

    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.user.findUnique({
        where: { refralCode: code },
      });
      exists = !!existing;
    } while (exists);

    return code;
  }

  /**
   * Mask phone number for privacy: +919123456789 → +91****6789
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    const visible = phone.slice(-4);
    const prefix = phone.slice(0, phone.length - 8);
    return `${prefix}****${visible}`;
  }
}
