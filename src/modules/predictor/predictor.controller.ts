import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PredictorService } from './predictor.service';
import { join } from 'path';
import { readFileSync } from 'fs';

@Controller()
export class PredictorController {
  constructor(private readonly predictorService: PredictorService) { }

  // ==========================================
  // Options (Dropdowns) APIs
  // ==========================================
  @Get('states')
  getStates() {
    return this.predictorService.getStates();
  }

  @Get('ai/options')
  getAiOptions(@Query() query: any) {
    return this.predictorService.getAiOptions(query);
  }

  @Get('state/:stateSlug/options')
  getStateOptions(@Param('stateSlug') stateSlug: string, @Query() query: any) {
    return this.predictorService.getStateOptions(stateSlug, query);
  }

  // ==========================================
  // Predict APIs
  // ==========================================
  @Post('ai/predict')
  predictAi(@Body() body: any) {
    return this.predictorService.predictAi(body);
  }

  @Post('state/:stateSlug/predict')
  predictState(@Param('stateSlug') stateSlug: string, @Body() body: any) {
    return this.predictorService.predictState(stateSlug, body);
  }
}
