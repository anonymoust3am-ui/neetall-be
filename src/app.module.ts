import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { BlogModule } from './modules/blogs/blog.module';
import { ChoiceListModule } from './modules/choice-list/choice-list.module';
import { ReferralModule } from './modules/referral/referral.module';
import { PackageModule } from './modules/packages/package.module';
import { CounsellingModule } from './modules/counselling/counselling.module';
import { InstituteModule } from './modules/institutes/institutes.module';
import { PredictorModule } from './modules/predictor/predictor.module';
import { AllotmentModule } from './modules/allotment/allotment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    ProfileModule,
    BlogModule,
    ChoiceListModule,
    ReferralModule,
    PackageModule,
    CounsellingModule,
    InstituteModule,
    PredictorModule,
    AllotmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
