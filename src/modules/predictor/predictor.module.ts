import { Module } from '@nestjs/common';
import { PredictorController } from './predictor.controller';
import { PredictorService } from './predictor.service';

@Module({
  controllers: [PredictorController],
  providers: [PredictorService],
})
export class PredictorModule {}
