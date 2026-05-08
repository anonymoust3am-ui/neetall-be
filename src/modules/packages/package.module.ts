import { Module } from '@nestjs/common';
import {
  PackageController,
  CoverageController,
  FeatureController,
  ToolController,
  InsightController,
  ExploreController,
  CouponController,
  PaymentController,
} from './package.controller';
import { PackageService } from './package.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [
    PackageController,
    CoverageController,
    FeatureController,
    ToolController,
    InsightController,
    ExploreController,
    CouponController,
    PaymentController,
  ],
  providers: [PackageService, AuthGuard],
  exports: [PackageService],
})
export class PackageModule {}
