/**
 * ChoiceList & ChoiceListDetails DTOs
 */

// ========== REQUEST DTOs ==========

// --- ChoiceList ---
export class CreateChoiceListDto {
  name!: string;
  caunselling!: string;
  details?: CreateChoiceListDetailDto[];
}

export class UpdateChoiceListDto {
  name?: string;
  caunselling?: string;
}

// --- ChoiceListDetails ---
export class CreateChoiceListDetailDto {
  name!: string;
  caunselling!: string;
  institute!: string;
  course!: string;
  quota!: string;
  catagory!: string;
  insertAt?: number;
}

export class UpdateChoiceListDetailDto {
  name?: string;
  caunselling?: string;
  institute?: string;
  course?: string;
  quota?: string;
  catagory?: string;
  insertAt?: number;
}

// --- Query ---
export class ChoiceListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

// ========== RESPONSE DTOs ==========

export class ChoiceListDetailResponseDto {
  id!: string;
  name!: string;
  caunselling!: string;
  institute!: string;
  course!: string;
  quota!: string;
  catagory!: string;
  insertAt!: number | null;
  closingRanks?: Record<string, Record<string, number | null>> | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ChoiceListResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  caunselling!: string;
  details!: ChoiceListDetailResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class ChoiceListSummaryResponseDto {
  id!: string;
  name!: string;
  caunselling!: string;
  detailsCount!: number;
  createdAt!: Date;
}

export class PaginatedChoiceListResponseDto {
  choiceLists!: ChoiceListSummaryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
