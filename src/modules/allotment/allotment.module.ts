import { Module } from '@nestjs/common';
import { AllotmentController } from './allotment.controller';
import { AllotmentService } from './allotment.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AllotmentController],
  providers: [AllotmentService],
})
export class AllotmentModule {}
