import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { PredictorModule } from '../predictor/predictor.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [PredictorModule, GeminiModule],
  controllers: [AiChatController],
  providers: [AiChatService],
})
export class AiChatModule {}