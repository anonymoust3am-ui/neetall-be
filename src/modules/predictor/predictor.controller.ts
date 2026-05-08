import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PredictorService } from './predictor.service';
import { join } from 'path';
import { readFileSync } from 'fs';

@Controller()
export class PredictorController {
  constructor(private readonly predictorService: PredictorService) { }

  // ==========================================
  // UI Route
  // ==========================================
  @Get('predictor-ui')
  getPredictorUI() {
    // Serve the legacy HTML layout wrapped in an endpoint for easy access
    try {
      const htmlPath = join(process.cwd(), 'src/modules/predictor/predictor.html');
      return readFileSync(htmlPath, 'utf8');
    } catch (e) {
      return 'UI File not found.';
    }
  }

  // ==========================================
  // Options (Dropdowns) APIs
  // ==========================================
  @Get('ai/options')
  getAiOptions(@Query() query: any) {
    return this.predictorService.getAiOptions(query);
  }

  @Get('mh/options')
  getMhOptions(@Query() query: any) {
    return this.predictorService.getMhOptions(query);
  }

  @Get('gj/options')
  getGjOptions(@Query() query: any) {
    return this.predictorService.getGjOptions(query);
  }

  @Get('up/options')
  getUpOptions(@Query() query: any) {
    return this.predictorService.getUpOptions(query);
  }

  // ==========================================
  // Predict APIs
  // ==========================================
  @Post('ai/predict')
  predictAi(@Body() body: any) {
    return this.predictorService.predictAi(body);
  }

  @Post('mh/predict')
  predictMh(@Body() body: any) {
    return this.predictorService.predictMh(body);
  }

  @Post('gj/predict')
  predictGj(@Body() body: any) {
    return this.predictorService.predictGj(body);
  }

  @Post('up/predict')
  predictUp(@Body() body: any) {
    return this.predictorService.predictUp(body);
  }
}
