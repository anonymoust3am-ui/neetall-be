import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService, AuthGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
