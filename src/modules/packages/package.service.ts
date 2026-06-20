import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreatePackageDto,
  UpdatePackageDto,
  CreateCoverageDto,
  CreateItemDto,
  CreateCouponDto,
  UpdateCouponDto,
  CreateOrderDto,
  VerifyPaymentDto,
  PackageResponseDto,
  PackageListResponseDto,
  CoverageResponseDto,
  ItemResponseDto,
  CouponResponseDto,
  CouponValidationResponseDto,
  OrderResponseDto,
  PaymentResponseDto,
  UserPackageResponseDto,
} from './dto/package.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

@Injectable()
export class PackageService {
  private razorpay: any;

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }

  // ================================================================
  // 📦 PACKAGE CRUD
  // ================================================================

  /**
   * List all available packages (public)
   */
  async getAllPackages(): Promise<PackageListResponseDto[]> {
    const packages = await this.prisma.package.findMany({
      where: { availability: 'AVAILABLE' },
      include: {
        coverage: true,
        _count: { select: { features: true } },
      },
      orderBy: { price: 'asc' },
    });

    return packages.map((p) => ({
      id: p.id,
      name: p.name,
      tier: p.tier,
      price: p.price,
      currency: p.currency,
      validTill: p.validTill,
      availability: p.availability,
      coverageType: p.coverage.type,
      featureCount: p._count.features,
    }));
  }

  /**
   * Get single package with all details (public)
   */
  async getPackageById(id: string): Promise<PackageResponseDto> {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        coverage: true,
        features: { include: { feature: true } },
        tools: { include: { tool: true } },
        insights: { include: { insight: true } },
        explores: { include: { explore: true } },
      },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return this.formatPackageResponse(pkg);
  }

  /**
   * Create a package (admin)
   */
  async createPackage(data: CreatePackageDto): Promise<PackageResponseDto> {
    // Validate coverage exists
    const coverage = await this.prisma.coverage.findUnique({
      where: { id: data.coverageId },
    });
    if (!coverage) {
      throw new NotFoundException('Coverage not found');
    }

    const pkg = await this.prisma.package.create({
      data: {
        name: data.name,
        tier: data.tier,
        price: data.price,
        validTill: new Date(data.validTill),
        availability: data.availability,
        coverageId: data.coverageId,
        CouponCode: data.couponCode,
        features: data.features?.length
          ? { create: data.features.map((fId) => ({ featureId: fId })) }
          : undefined,
        tools: data.tools?.length
          ? { create: data.tools.map((tId) => ({ toolId: tId })) }
          : undefined,
        insights: data.insights?.length
          ? { create: data.insights.map((iId) => ({ insightId: iId })) }
          : undefined,
        explores: data.explores?.length
          ? { create: data.explores.map((eId) => ({ exploreId: eId })) }
          : undefined,
      },
      include: {
        coverage: true,
        features: { include: { feature: true } },
        tools: { include: { tool: true } },
        insights: { include: { insight: true } },
        explores: { include: { explore: true } },
      },
    });

    return this.formatPackageResponse(pkg);
  }

  /**
   * Update a package (admin)
   */
  async updatePackage(
    id: string,
    data: UpdatePackageDto,
  ): Promise<PackageResponseDto> {
    const existing = await this.prisma.package.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Package not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.validTill !== undefined)
      updateData.validTill = new Date(data.validTill);
    if (data.availability !== undefined)
      updateData.availability = data.availability;
    if (data.coverageId !== undefined) updateData.coverageId = data.coverageId;
    if (data.couponCode !== undefined) updateData.CouponCode = data.couponCode;

    const pkg = await this.prisma.package.update({
      where: { id },
      data: updateData,
      include: {
        coverage: true,
        features: { include: { feature: true } },
        tools: { include: { tool: true } },
        insights: { include: { insight: true } },
        explores: { include: { explore: true } },
      },
    });

    return this.formatPackageResponse(pkg);
  }

  /**
   * Delete a package (admin)
   */
  async deletePackage(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.package.findUnique({
      where: { id },
      include: { _count: { select: { userPackages: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Package not found');
    }

    if (existing._count.userPackages > 0) {
      throw new BadRequestException(
        `Cannot delete package with ${existing._count.userPackages} active subscription(s). Deactivate instead.`,
      );
    }

    // Clean up join tables
    await this.prisma.packageFeature.deleteMany({ where: { packageId: id } });
    await this.prisma.packageTool.deleteMany({ where: { packageId: id } });
    await this.prisma.packageInsight.deleteMany({ where: { packageId: id } });
    await this.prisma.packageExplore.deleteMany({ where: { packageId: id } });
    await this.prisma.package.delete({ where: { id } });

    return { message: 'Package deleted successfully' };
  }

  // ================================================================
  // 🏷️ COVERAGE CRUD
  // ================================================================

  async createCoverage(data: CreateCoverageDto): Promise<CoverageResponseDto> {
    const coverage = await this.prisma.coverage.create({
      data: { type: data.type, description: data.description },
    });
    return {
      id: coverage.id,
      type: coverage.type,
      description: coverage.description,
    };
  }

  async getAllCoverages(): Promise<CoverageResponseDto[]> {
    const coverages = await this.prisma.coverage.findMany();
    return coverages.map((c) => ({
      id: c.id,
      type: c.type,
      description: c.description,
    }));
  }

  // ================================================================
  // 🔧 FEATURE / TOOL / INSIGHT / EXPLORE CRUD
  // ================================================================

  async createFeature(data: CreateItemDto): Promise<ItemResponseDto> {
    const item = await this.prisma.feature.create({
      data: { name: data.name },
    });
    return { id: item.id, name: item.name };
  }

  async getAllFeatures(): Promise<ItemResponseDto[]> {
    return this.prisma.feature.findMany({ select: { id: true, name: true } });
  }

  async createTool(data: CreateItemDto): Promise<ItemResponseDto> {
    const item = await this.prisma.tool.create({ data: { name: data.name } });
    return { id: item.id, name: item.name };
  }

  async getAllTools(): Promise<ItemResponseDto[]> {
    return this.prisma.tool.findMany({ select: { id: true, name: true } });
  }

  async createInsight(data: CreateItemDto): Promise<ItemResponseDto> {
    const item = await this.prisma.insight.create({
      data: { name: data.name },
    });
    return { id: item.id, name: item.name };
  }

  async getAllInsights(): Promise<ItemResponseDto[]> {
    return this.prisma.insight.findMany({ select: { id: true, name: true } });
  }

  async createExplore(data: CreateItemDto): Promise<ItemResponseDto> {
    const item = await this.prisma.explore.create({
      data: { name: data.name },
    });
    return { id: item.id, name: item.name };
  }

  async getAllExplores(): Promise<ItemResponseDto[]> {
    return this.prisma.explore.findMany({ select: { id: true, name: true } });
  }

  // ================================================================
  // 🎫 COUPON CRUD
  // ================================================================

  async createCoupon(data: CreateCouponDto): Promise<CouponResponseDto> {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description,
        discount: data.discount,
        validTill: new Date(data.validTill),
      },
    });

    return this.formatCouponResponse(coupon);
  }

  async getAllCoupons(): Promise<CouponResponseDto[]> {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return coupons.map((c) => this.formatCouponResponse(c));
  }

  async updateCoupon(
    id: string,
    data: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    const updateData: any = {};
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.validTill !== undefined)
      updateData.validTill = new Date(data.validTill);

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return this.formatCouponResponse(coupon);
  }

  async deleteCoupon(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted successfully' };
  }

  /**
   * Validate a coupon against a package
   */
  async validateCoupon(
    code: string,
    packageId: string,
  ): Promise<CouponValidationResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    if (new Date() > coupon.validTill) {
      throw new BadRequestException('Coupon has expired');
    }

    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const savings = Math.round((pkg.price * coupon.discount) / 100);
    const discountedPrice = pkg.price - savings;

    return {
      valid: true,
      discount: coupon.discount,
      originalPrice: pkg.price,
      discountedPrice,
      savings,
      message: `${coupon.discount}% discount applied! You save ₹${savings}`,
    };
  }

  // ================================================================
  // 💳 RAZORPAY PAYMENT
  // ================================================================

  /**
   * Create a Razorpay order for a package purchase
   */
  async createOrder(
    userId: string,
    data: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    // Validate package
    const pkg = await this.prisma.package.findUnique({
      where: { id: data.packageId },
    });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    if (pkg.availability !== 'AVAILABLE') {
      throw new BadRequestException('Package is currently unavailable');
    }

    // Check if user already has this package (active)
    const existingPurchase = await this.prisma.userPackage.findFirst({
      where: {
        userId,
        packageId: data.packageId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPurchase) {
      throw new ConflictException(
        'You already have an active subscription for this package',
      );
    }

    // Calculate price with coupon discount
    let finalAmount = pkg.price * 100; // Convert to paise
    let discountAmount = 0;

    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: data.couponCode.toUpperCase() },
      });

      if (!coupon) {
        throw new NotFoundException('Invalid coupon code');
      }
      if (new Date() > coupon.validTill) {
        throw new BadRequestException('Coupon has expired');
      }

      discountAmount = Math.round((pkg.price * coupon.discount) / 100) * 100; // in paise
      finalAmount = finalAmount - discountAmount;
    }

    // Ensure minimum amount (Razorpay minimum is ₹1 = 100 paise)
    if (finalAmount < 100) {
      finalAmount = 100;
    }

    // Create Razorpay order
    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;

    const razorpayOrder = await this.razorpay.orders.create({
      amount: finalAmount,
      currency: pkg.currency,
      receipt,
      notes: {
        userId,
        packageId: data.packageId,
        packageName: pkg.name,
        couponCode: data.couponCode || '',
      },
    });

    // Save payment record
    await this.prisma.payment.create({
      data: {
        userId,
        packageId: data.packageId,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency: pkg.currency,
        status: 'CREATED',
        couponCode: data.couponCode?.toUpperCase() || null,
        discountAmount: discountAmount || null,
        receipt,
      },
    });

    return {
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: pkg.currency,
      packageName: pkg.name,
      couponApplied: !!data.couponCode,
      discountAmount,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    };
  }

  /**
   * Verify Razorpay payment and activate the user's package
   */
  async verifyPayment(
    userId: string,
    data: VerifyPaymentDto,
  ): Promise<{
    success: boolean;
    message: string;
    userPackage?: UserPackageResponseDto;
  }> {
    // Find the payment record
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: data.razorpayOrderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Payment does not belong to this user');
    }

    if (payment.status === 'PAID') {
      throw new ConflictException('Payment already verified');
    }

    // Verify signature using HMAC SHA256
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== data.razorpaySignature) {
      // Mark as failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      throw new BadRequestException(
        'Payment verification failed — invalid signature',
      );
    }

    // Payment is verified — update payment record
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
      },
    });

    // Get package to determine expiry
    const pkg = await this.prisma.package.findUnique({
      where: { id: payment.packageId },
    });

    // Create UserPackage (activate subscription)
    const userPackage = await this.prisma.userPackage.create({
      data: {
        userId,
        packageId: payment.packageId,
        paymentId: payment.id,
        expiresAt: pkg?.validTill || null,
        isActive: true,
      },
      include: {
        package: { select: { name: true, tier: true } },
      },
    });

    return {
      success: true,
      message: 'Payment verified and package activated',
      userPackage: {
        id: userPackage.id,
        packageName: userPackage.package.name,
        packageTier: userPackage.package.tier,
        expiresAt: userPackage.expiresAt,
        isActive: userPackage.isActive,
        purchasedAt: userPackage.createdAt,
      },
    };
  }

  // ================================================================
  // 📋 USER PACKAGES
  // ================================================================

  /**
   * Get all packages purchased by a user
   */
  async getUserPackages(userId: string): Promise<UserPackageResponseDto[]> {
    const userPackages = await this.prisma.userPackage.findMany({
      where: { userId },
      include: {
        package: { select: { name: true, tier: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return userPackages.map((up) => ({
      id: up.id,
      packageName: up.package.name,
      packageTier: up.package.tier,
      expiresAt: up.expiresAt,
      isActive: up.isActive && (!up.expiresAt || up.expiresAt > new Date()),
      purchasedAt: up.createdAt,
    }));
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      status: p.status,
      packageId: p.packageId,
      amount: p.amount,
      currency: p.currency,
      razorpayPaymentId: p.razorpayPaymentId,
      createdAt: p.createdAt,
    }));
  }

  // ================================================================
  // 🛠️ HELPERS
  // ================================================================

  private formatPackageResponse(pkg: any): PackageResponseDto {
    return {
      id: pkg.id,
      name: pkg.name,
      tier: pkg.tier,
      price: pkg.price,
      currency: pkg.currency,
      validTill: pkg.validTill,
      availability: pkg.availability,
      coverage: {
        id: pkg.coverage.id,
        type: pkg.coverage.type,
        description: pkg.coverage.description,
      },
      features: (pkg.features || []).map((f: any) => ({
        id: f.feature.id,
        name: f.feature.name,
      })),
      tools: (pkg.tools || []).map((t: any) => ({
        id: t.tool.id,
        name: t.tool.name,
      })),
      insights: (pkg.insights || []).map((i: any) => ({
        id: i.insight.id,
        name: i.insight.name,
      })),
      explores: (pkg.explores || []).map((e: any) => ({
        id: e.explore.id,
        name: e.explore.name,
      })),
      couponCode: pkg.CouponCode,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    };
  }

  private formatCouponResponse(coupon: any): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount: coupon.discount,
      validTill: coupon.validTill,
      isValid: new Date() < coupon.validTill,
    };
  }
}
