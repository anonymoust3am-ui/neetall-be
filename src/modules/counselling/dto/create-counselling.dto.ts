import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBodyQuotaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  short_name?: string;

  @IsOptional()
  @IsString()
  tooltip_content?: string;

  @IsOptional()
  @IsString()
  tooltip_content_html?: string;

  @IsOptional()
  @IsString()
  master_quota?: string;
}

export class CreateBodyDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  counselling_type?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  website_goto?: string;

  @IsOptional()
  @IsString()
  website_registration?: string;

  @IsOptional()
  @IsString()
  website_prospectus?: string;

  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allotment_sessions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  closing_rank_sessions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  seat_matrix_sessions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fee_stipend_bond_sessions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBodyQuotaDto)
  quotas?: CreateBodyQuotaDto[];
}

export class CreateCounsellingOptionDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBodyDto)
  bodies?: CreateBodyDto[];
}
