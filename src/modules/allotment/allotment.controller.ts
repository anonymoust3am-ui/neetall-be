import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { AllotmentService } from './allotment.service';
import { GetAllotmentsQueryDto } from './dto/get-allotments-query.dto';

@Controller('allotment')
export class AllotmentController {
  constructor(private readonly allotmentService: AllotmentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllotments(@Query() queryDto: GetAllotmentsQueryDto) {
    return await this.allotmentService.getAllotments(queryDto);
  }
}
