import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InstituteController } from './institutes.controller';
import { InstituteService } from './institutes.service';

@Module({
  imports: [HttpModule],
  controllers: [InstituteController],
  providers: [InstituteService],
  exports: [InstituteService],
})
export class InstituteModule {}
