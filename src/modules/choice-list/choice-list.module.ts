import { Module } from '@nestjs/common';
import { ChoiceListController } from './choice-list.controller';
import { ChoiceListService } from './choice-list.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [ChoiceListController],
  providers: [ChoiceListService, AuthGuard],
  exports: [ChoiceListService],
})
export class ChoiceListModule {}
