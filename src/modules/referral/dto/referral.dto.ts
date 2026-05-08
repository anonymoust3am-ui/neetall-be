/**
 * Referral System DTOs
 */

// ========== REQUEST DTOs ==========

export class ApplyReferralDto {
  code!: string;
}

// ========== RESPONSE DTOs ==========

export class ReferralCodeResponseDto {
  referralCode!: string;
  referralLink!: string;
}

export class ReferredUserResponseDto {
  id!: string;
  referredName!: string | null;
  referredPhone!: string | null;
  isRewarded!: boolean;
  createdAt!: Date;
}

export class ReferralStatsResponseDto {
  referralCode!: string | null;
  totalReferrals!: number;
  rewardedReferrals!: number;
  pendingReferrals!: number;
}

export class ReferralListResponseDto {
  referrals!: ReferredUserResponseDto[];
  total!: number;
  stats!: ReferralStatsResponseDto;
}
