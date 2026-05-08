import { Module } from '@nestjs/common';
import { BlogController, AuthorController } from './blog.controller';
import { BlogService } from './blog.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [FirebaseModule, PrismaModule],
  controllers: [BlogController, AuthorController],
  providers: [BlogService, AuthGuard],
  exports: [BlogService],
})
export class BlogModule {}
