import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreatePackageDto,
  UpdatePackageDto,
  CreateCoverageDto,
  CreateItemDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CreateOrderDto,
  VerifyPaymentDto,
} from './dto/package.dto';

// ========================
// 📦 PACKAGES (public GET, auth for mutations)
// ========================

@Controller('packages')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  /** GET /packages — List all available packages (public) */
  @Get()
  async getAllPackages() {
    return this.packageService.getAllPackages();
  }

  /** GET /packages/:id — Get package details (public) */
  @Get(':id')
  async getPackageById(@Param('id') id: string) {
    return this.packageService.getPackageById(id);
  }

  /** POST /packages — Create package (admin) */
  @Post()
  @UseGuards(AuthGuard)
  async createPackage(@Body() body: CreatePackageDto) {
    return this.packageService.createPackage(body);
  }

  /** PATCH /packages/:id — Update package (admin) */
  @Patch(':id')
  @UseGuards(AuthGuard)
  async updatePackage(@Param('id') id: string, @Body() body: UpdatePackageDto) {
    return this.packageService.updatePackage(id, body);
  }

  /** DELETE /packages/:id — Delete package (admin) */
  @Delete(':id')
  @UseGuards(AuthGuard)
  async deletePackage(@Param('id') id: string) {
    return this.packageService.deletePackage(id);
  }
}

// ========================
// 🏷️ COVERAGES
// ========================

@Controller('coverages')
export class CoverageController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getAll() {
    return this.packageService.getAllCoverages();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateCoverageDto) {
    return this.packageService.createCoverage(body);
  }
}

// ========================
// 🔧 FEATURES / TOOLS / INSIGHTS / EXPLORES
// ========================

@Controller('features')
export class FeatureController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getAll() {
    return this.packageService.getAllFeatures();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateItemDto) {
    return this.packageService.createFeature(body);
  }
}

@Controller('tools')
export class ToolController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getAll() {
    return this.packageService.getAllTools();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateItemDto) {
    return this.packageService.createTool(body);
  }
}

@Controller('insights')
export class InsightController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getAll() {
    return this.packageService.getAllInsights();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateItemDto) {
    return this.packageService.createInsight(body);
  }
}

@Controller('explores')
export class ExploreController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getAll() {
    return this.packageService.getAllExplores();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateItemDto) {
    return this.packageService.createExplore(body);
  }
}

// ========================
// 🎫 COUPONS (admin)
// ========================

@Controller('coupons')
export class CouponController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.packageService.getAllCoupons();
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreateCouponDto) {
    return this.packageService.createCoupon(body);
  }

  /** POST /coupons/validate — Validate coupon against a package */
  @Post('validate')
  async validate(@Body() body: ValidateCouponDto) {
    return this.packageService.validateCoupon(body.code, body.packageId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.packageService.updateCoupon(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string) {
    return this.packageService.deleteCoupon(id);
  }
}

// ========================
// 💳 PAYMENTS (all auth-required)
// ========================

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly packageService: PackageService) {}

  /** POST /payments/create-order — Create Razorpay order */
  @Post('create-order')
  async createOrder(@Req() req: any, @Body() body: CreateOrderDto) {
    return this.packageService.createOrder(req.user.id, body);
  }

  /** POST /payments/verify — Verify payment and activate package */
  @Post('verify')
  async verifyPayment(@Req() req: any, @Body() body: VerifyPaymentDto) {
    return this.packageService.verifyPayment(req.user.id, body);
  }

  /** GET /payments/history — Get payment history */
  @Get('history')
  async getHistory(@Req() req: any) {
    return this.packageService.getPaymentHistory(req.user.id);
  }

  /** GET /payments/my-packages — Get user's purchased packages */
  @Get('my-packages')
  async getMyPackages(@Req() req: any) {
    return this.packageService.getUserPackages(req.user.id);
  }
}
