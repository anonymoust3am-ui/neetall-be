import { PartialType } from '@nestjs/mapped-types';
import { CreateCounsellingOptionDto } from './create-counselling.dto';

export class UpdateCounsellingOptionDto extends PartialType(
  CreateCounsellingOptionDto,
) {}
