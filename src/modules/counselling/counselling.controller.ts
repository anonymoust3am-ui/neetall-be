import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CounsellingService } from './counselling.service';
import { CreateCounsellingOptionDto } from './dto/create-counselling.dto';
import { UpdateCounsellingOptionDto } from './dto/update-counselling.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('counselling')
export class CounsellingController {
  constructor(private readonly counsellingService: CounsellingService) {}

  // PUBLIC - Get all counselling options
  @Get()
  findAll() {
    return this.counsellingService.findAll();
  }

  // PUBLIC - Get counselling option by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.counsellingService.findOne(id);
  }

  // PUBLIC - Get counselling option by value
  @Get('value/:value')
  findByValue(@Param('value') value: string) {
    return this.counsellingService.findByValue(value);
  }

  // PRIVATE - Create new counselling option (Admin only)
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createCounsellingOptionDto: CreateCounsellingOptionDto) {
    return this.counsellingService.create(createCounsellingOptionDto);
  }

  // PRIVATE - Update counselling option (Admin only)
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCounsellingOptionDto: UpdateCounsellingOptionDto,
  ) {
    return this.counsellingService.update(id, updateCounsellingOptionDto);
  }

  // PRIVATE - Delete counselling option (Admin only)
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    return this.counsellingService.remove(id);
  }
}
