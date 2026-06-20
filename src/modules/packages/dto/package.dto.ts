/**
 * Package & Payment DTOs
 */

// ========== REQUEST DTOs ==========

// --- Package (Admin) ---
export class CreatePackageDto {
  name!: string;
  tier!: 'PRO' | 'STANDARD';
  price!: number; // in INR (4499)
  validTill!: string; // ISO date
  availability!: 'AVAILABLE' | 'UNAVAILABLE';
  coverageId!: string;
  couponCode?: string;
  features?: string[]; // feature IDs
  tools?: string[]; // tool IDs
  insights?: string[]; // insight IDs
  explores?: string[]; // explore IDs
}

export class UpdatePackageDto {
  name?: string;
  tier?: 'PRO' | 'STANDARD';
  price?: number;
  validTill?: string;
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  coverageId?: string;
  couponCode?: string;
}

// --- Coverage ---
export class CreateCoverageDto {
  type!: 'ALL_INDIA' | 'ALL_INDIA_AND_STATES';
  description?: string;
}

// --- Feature/Tool/Insight/Explore ---
export class CreateItemDto {
  name!: string;
}

// --- Coupon ---
export class CreateCouponDto {
  code!: string;
  description?: string;
  discount!: number; // percentage (20 = 20%)
  validTill!: string; // ISO date
}

export class UpdateCouponDto {
  description?: string;
  discount?: number;
  validTill?: string;
}

export class ValidateCouponDto {
  code!: string;
  packageId!: string;
}

// --- Payment ---
export class CreateOrderDto {
  packageId!: string;
  couponCode?: string;
}

export class VerifyPaymentDto {
  razorpayOrderId!: string;
  razorpayPaymentId!: string;
  razorpaySignature!: string;
}

// ========== RESPONSE DTOs ==========

export class CoverageResponseDto {
  id!: string;
  type!: string;
  description!: string | null;
}

export class ItemResponseDto {
  id!: string;
  name!: string;
}

export class PackageResponseDto {
  id!: string;
  name!: string;
  tier!: string;
  price!: number;
  currency!: string;
  validTill!: Date;
  availability!: string;
  coverage!: CoverageResponseDto;
  features!: ItemResponseDto[];
  tools!: ItemResponseDto[];
  insights!: ItemResponseDto[];
  explores!: ItemResponseDto[];
  couponCode!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PackageListResponseDto {
  id!: string;
  name!: string;
  tier!: string;
  price!: number;
  currency!: string;
  validTill!: Date;
  availability!: string;
  coverageType!: string;
  featureCount!: number;
}

export class CouponResponseDto {
  id!: string;
  code!: string;
  description!: string | null;
  discount!: number;
  validTill!: Date;
  isValid!: boolean;
}

export class CouponValidationResponseDto {
  valid!: boolean;
  discount!: number;
  originalPrice!: number;
  discountedPrice!: number;
  savings!: number;
  message!: string;
}

export class OrderResponseDto {
  orderId!: string;
  razorpayOrderId!: string;
  amount!: number; // in paise
  currency!: string;
  packageName!: string;
  couponApplied!: boolean;
  discountAmount!: number;
  razorpayKeyId!: string;
}

export class PaymentResponseDto {
  id!: string;
  status!: string;
  packageId!: string;
  amount!: number;
  currency!: string;
  razorpayPaymentId!: string | null;
  createdAt!: Date;
}

export class UserPackageResponseDto {
  id!: string;
  packageName!: string;
  packageTier!: string;
  expiresAt!: Date | null;
  isActive!: boolean;
  purchasedAt!: Date;
}
