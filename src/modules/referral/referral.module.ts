import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [ReferralController],
  providers: [ReferralService, AuthGuard],
  exports: [ReferralService],
})
export class ReferralModule {}
