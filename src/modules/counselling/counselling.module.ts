import { Module } from '@nestjs/common';
import { CounsellingService } from './counselling.service';
import { CounsellingController } from './counselling.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [CounsellingController],
  providers: [CounsellingService],
  imports: [PrismaModule, AuthModule],
  exports: [CounsellingService],
})
export class CounsellingModule {}
