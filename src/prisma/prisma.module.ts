import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // optional but common
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}