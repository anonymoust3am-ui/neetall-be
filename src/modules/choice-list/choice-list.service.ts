import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateChoiceListDto,
  UpdateChoiceListDto,
  CreateChoiceListDetailDto,
  UpdateChoiceListDetailDto,
  ChoiceListQueryDto,
  ChoiceListResponseDto,
  ChoiceListDetailResponseDto,
  PaginatedChoiceListResponseDto,
} from './dto/choice-list.dto';

@Injectable()
export class ChoiceListService {
  constructor(private prisma: PrismaService) {}

  // ========================
  // 📋 CHOICE LIST CRUD
  // ========================

  /**
   * Create a new choice list with optional inline details
   */
  async createChoiceList(
    userId: string,
    data: CreateChoiceListDto,
  ): Promise<ChoiceListResponseDto> {
    console.log(
      `[ChoiceListService] createChoiceList called: name="${data.name}", detailsCount=${data.details?.length || 0}`,
    );
    // Check name uniqueness
    const existing = await this.prisma.choiceList.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Choice list with this name already exists');
    }

    let detailsCreatePayload: any[] | undefined = undefined;
    if (data.details && data.details.length > 0) {
      detailsCreatePayload = await Promise.all(
        data.details.map(async (d) => {
          const closingRanks = await this.getClosingRanks(
            d.institute,
            d.course,
            d.quota,
            d.catagory,
          );

          return {
            name: d.name,
            Caunselling: d.caunselling,
            Institute: d.institute,
            Course: d.course,
            Quota: d.quota,
            Catagory: d.catagory,
            InsertAt: d.insertAt,
            closingRanks: closingRanks as any,
          };
        }),
      );
    }

    const choiceList = await this.prisma.choiceList.create({
      data: {
        userId,
        name: data.name,
        Caunselling: data.caunselling,
        ChoiceListDetails: detailsCreatePayload
          ? {
              create: detailsCreatePayload,
            }
          : undefined,
      },
      include: { ChoiceListDetails: true },
    });

    return this.formatChoiceListResponse(choiceList);
  }

  /**
   * Get all choice lists for a user with pagination and search
   */
  async getUserChoiceLists(
    userId: string,
    query: ChoiceListQueryDto,
  ): Promise<PaginatedChoiceListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { Caunselling: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [choiceLists, total] = await Promise.all([
      this.prisma.choiceList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { ChoiceListDetails: true } },
        },
      }),
      this.prisma.choiceList.count({ where }),
    ]);

    return {
      choiceLists: choiceLists.map((cl) => ({
        id: cl.id,
        name: cl.name,
        caunselling: cl.Caunselling,
        detailsCount: cl._count.ChoiceListDetails,
        createdAt: cl.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single choice list by ID (with all details)
   */
  async getChoiceListById(
    userId: string,
    id: string,
  ): Promise<ChoiceListResponseDto> {
    const choiceList = await this.prisma.choiceList.findUnique({
      where: { id },
      include: {
        ChoiceListDetails: { orderBy: { InsertAt: 'asc' } },
      },
    });

    if (!choiceList) {
      throw new NotFoundException('Choice list not found');
    }
    if (choiceList.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    return this.formatChoiceListResponse(choiceList);
  }

  /**
   * Update a choice list
   */
  async updateChoiceList(
    userId: string,
    id: string,
    data: UpdateChoiceListDto,
  ): Promise<ChoiceListResponseDto> {
    const existing = await this.prisma.choiceList.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Choice list not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.choiceList.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw new ConflictException(
          'Choice list with this name already exists',
        );
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.caunselling !== undefined)
      updateData.Caunselling = data.caunselling;

    const choiceList = await this.prisma.choiceList.update({
      where: { id },
      data: updateData,
      include: {
        ChoiceListDetails: { orderBy: { InsertAt: 'asc' } },
      },
    });

    return this.formatChoiceListResponse(choiceList);
  }

  /**
   * Delete a choice list (cascades to details)
   */
  async deleteChoiceList(
    userId: string,
    id: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.choiceList.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Choice list not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    // Details are cascade-deleted by the relation
    await this.prisma.choiceListDetails.deleteMany({
      where: { choiceListId: id },
    });
    await this.prisma.choiceList.delete({ where: { id } });

    return { message: 'Choice list deleted successfully' };
  }

  // ========================
  // 📄 CHOICE LIST DETAILS CRUD
  // ========================

  /**
   * Add a detail entry to a choice list
   */
  async addDetail(
    userId: string,
    choiceListId: string,
    data: CreateChoiceListDetailDto,
  ): Promise<ChoiceListDetailResponseDto> {
    console.log(
      `[ChoiceListService] addDetail called: choiceListId="${choiceListId}", name="${data.name}", institute="${data.institute}", course="${data.course}", quota="${data.quota}", catagory="${data.catagory}"`,
    );
    const choiceList = await this.prisma.choiceList.findUnique({
      where: { id: choiceListId },
    });
    if (!choiceList) {
      throw new NotFoundException('Choice list not found');
    }
    if (choiceList.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    // Check detail name uniqueness
    const existing = await this.prisma.choiceListDetails.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Detail with this name already exists');
    }

    const closingRanks = await this.getClosingRanks(
      data.institute,
      data.course,
      data.quota,
      data.catagory,
    );

    const detail = await this.prisma.choiceListDetails.create({
      data: {
        choiceListId,
        name: data.name,
        Caunselling: data.caunselling,
        Institute: data.institute,
        Course: data.course,
        Quota: data.quota,
        Catagory: data.catagory,
        InsertAt: data.insertAt,
        closingRanks: closingRanks as any,
      },
    });

    return this.formatDetailResponse(detail);
  }

  /**
   * Update a detail entry
   */
  async updateDetail(
    userId: string,
    detailId: string,
    data: UpdateChoiceListDetailDto,
  ): Promise<ChoiceListDetailResponseDto> {
    console.log(
      `[ChoiceListService] updateDetail called: detailId="${detailId}", data=`,
      JSON.stringify(data),
    );
    const detail = await this.prisma.choiceListDetails.findUnique({
      where: { id: detailId },
      include: { choiceList: true },
    });
    if (!detail) {
      throw new NotFoundException('Choice list detail not found');
    }
    if (detail.choiceList.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== detail.name) {
      const duplicate = await this.prisma.choiceListDetails.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw new ConflictException('Detail with this name already exists');
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.caunselling !== undefined)
      updateData.Caunselling = data.caunselling;
    if (data.institute !== undefined) updateData.Institute = data.institute;
    if (data.course !== undefined) updateData.Course = data.course;
    if (data.quota !== undefined) updateData.Quota = data.quota;
    if (data.catagory !== undefined) updateData.Catagory = data.catagory;
    if (data.insertAt !== undefined) updateData.InsertAt = data.insertAt;

    // Check if college details are changing
    const isCollegeDetailsChanging =
      (data.institute !== undefined && data.institute !== detail.Institute) ||
      (data.course !== undefined && data.course !== detail.Course) ||
      (data.quota !== undefined && data.quota !== detail.Quota) ||
      (data.catagory !== undefined && data.catagory !== detail.Catagory);

    if (isCollegeDetailsChanging) {
      const inst =
        data.institute !== undefined ? data.institute : detail.Institute;
      const crs = data.course !== undefined ? data.course : detail.Course;
      const qt = data.quota !== undefined ? data.quota : detail.Quota;
      const cat = data.catagory !== undefined ? data.catagory : detail.Catagory;

      const closingRanks = await this.getClosingRanks(inst, crs, qt, cat);
      updateData.closingRanks = closingRanks as any;
    }

    const updated = await this.prisma.choiceListDetails.update({
      where: { id: detailId },
      data: updateData,
    });

    return this.formatDetailResponse(updated);
  }

  /**
   * Delete a detail entry
   */
  async deleteDetail(
    userId: string,
    detailId: string,
  ): Promise<{ message: string }> {
    const detail = await this.prisma.choiceListDetails.findUnique({
      where: { id: detailId },
      include: { choiceList: true },
    });
    if (!detail) {
      throw new NotFoundException('Choice list detail not found');
    }
    if (detail.choiceList.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    await this.prisma.choiceListDetails.delete({ where: { id: detailId } });

    return { message: 'Choice list detail deleted successfully' };
  }

  /**
   * Bulk reorder details within a choice list
   */
  async reorderDetails(
    userId: string,
    choiceListId: string,
    orderedIds: string[],
  ): Promise<{ message: string }> {
    const choiceList = await this.prisma.choiceList.findUnique({
      where: { id: choiceListId },
    });
    if (!choiceList) {
      throw new NotFoundException('Choice list not found');
    }
    if (choiceList.userId !== userId) {
      throw new ForbiddenException('You do not own this choice list');
    }

    // Update InsertAt for each detail
    const updates = orderedIds.map((id, index) =>
      this.prisma.choiceListDetails.update({
        where: { id },
        data: { InsertAt: index },
      }),
    );

    await Promise.all(updates);

    return { message: 'Details reordered successfully' };
  }

  // ========================
  // 🛠️ HELPERS
  // ========================

  private formatChoiceListResponse(choiceList: any): ChoiceListResponseDto {
    return {
      id: choiceList.id,
      userId: choiceList.userId,
      name: choiceList.name,
      caunselling: choiceList.Caunselling,
      details: (choiceList.ChoiceListDetails || []).map((d: any) =>
        this.formatDetailResponse(d),
      ),
      createdAt: choiceList.createdAt,
      updatedAt: choiceList.updatedAt,
    };
  }

  private formatDetailResponse(detail: any): ChoiceListDetailResponseDto {
    return {
      id: detail.id,
      name: detail.name,
      caunselling: detail.Caunselling,
      institute: detail.Institute,
      course: detail.Course,
      quota: detail.Quota,
      catagory: detail.Catagory,
      insertAt: detail.InsertAt,
      closingRanks: detail.closingRanks || null,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }

  private async getClosingRanks(
    institute: string,
    course: string,
    quota: string,
    category: string,
  ): Promise<Record<string, Record<string, number>> | null> {
    console.log(
      `[ChoiceListService] getClosingRanks START for: "${institute}" | "${course}" | "${quota}" | "${category}"`,
    );
    const quotaConditions = this.getQuotaQueryConditions(quota);
    const categoryConditions = this.getCategoryQueryConditions(category);

    const whereClause: any = {
      instituteNameSnapshot: { equals: institute, mode: 'insensitive' },
      courseNameSnapshot: { equals: course, mode: 'insensitive' },
      isPwd: category.toUpperCase().includes('PWD'),
      OR: quotaConditions,
    };

    if (categoryConditions.length > 0) {
      whereClause.AND = [
        {
          OR: categoryConditions,
        },
      ];
    }

    console.log(
      `[ChoiceListService] getClosingRanks whereClause:`,
      JSON.stringify(whereClause, null, 2),
    );

    const allotments = await this.prisma.allotmentRecord.findMany({
      where: whereClause,
      select: {
        sessionYear: true,
        roundNo: true,
        rank: true,
      },
    });

    console.log(
      `[ChoiceListService] getClosingRanks allotments count: ${allotments?.length || 0}`,
    );
    if (allotments && allotments.length > 0) {
      console.log(
        `[ChoiceListService] getClosingRanks sample allotment:`,
        JSON.stringify(allotments[0]),
      );
    }

    if (!allotments || allotments.length === 0) {
      console.log(`[ChoiceListService] getClosingRanks returning null`);
      return null;
    }

    const ranksGrouped: Record<string, Record<string, number>> = {};
    for (const match of allotments) {
      const year = String(match.sessionYear);
      const round = String(match.roundNo);
      const rank = match.rank;

      if (rank !== null && rank !== undefined) {
        if (!ranksGrouped[year]) {
          ranksGrouped[year] = {};
        }
        const currentMax = ranksGrouped[year][round];
        if (currentMax === undefined || rank > currentMax) {
          ranksGrouped[year][round] = rank;
          ranksGrouped[year][`R${round}`] = rank; // Support both "1" and "R1" formats
        }
      }
    }

    console.log(
      `[ChoiceListService] getClosingRanks returning:`,
      JSON.stringify(ranksGrouped),
    );
    return Object.keys(ranksGrouped).length > 0 ? ranksGrouped : null;
  }

  private getQuotaQueryConditions(quota: string): any[] {
    const q = quota.toUpperCase().trim();
    if (q === 'AIQ') {
      return [
        {
          quotaNormalizedSnapshot: {
            in: ['AIQ', 'BHU', 'AMU', 'AIIMS', 'JIPMER', 'ESI'],
          },
        },
        {
          masterQuotaSnapshot: {
            in: [
              'All India Quota',
              'BHU Seats',
              'AMU Seats',
              'AIIMS Seats',
              'JIPMER Seats',
              'ESI Seats',
            ],
          },
        },
        {
          ownershipSnapshot: {
            in: ['AIIMS', 'JIPMER', 'CENTRAL_UNIVERSITY', 'ESI'],
          },
        },
      ];
    } else if (q === 'STATE QUOTA' || q === 'STATE') {
      return [
        {
          quotaNormalizedSnapshot: { notIn: ['AIQ', 'BHU', 'AMU', 'AIIMS', 'JIPMER', 'ESI'] },
          NOT: [
            { quotaNameSnapshot: { contains: 'All India', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'AIIMS', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'JIPMER', mode: 'insensitive' } },
          ],
          OR: [
            { quotaNormalizedSnapshot: 'STATE' },
            { quotaNormalizedSnapshot: { contains: 'GOVT', mode: 'insensitive' } },
            { quotaNormalizedSnapshot: { contains: 'STATE', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'State', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'Govt', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'Government', mode: 'insensitive' } },
            { quotaNameSnapshot: { contains: 'Seats', mode: 'insensitive' } },
            { ownershipSnapshot: 'GOVERNMENT' }
          ]
        }
      ];
    } else if (q === 'NRI') {
      return [
        { quotaNormalizedSnapshot: 'NRI' },
        { quotaNameSnapshot: { contains: 'NRI', mode: 'insensitive' } },
        { isNri: true },
      ];
    } else if (q === 'MANAGEMENT' || q === 'PAID') {
      return [
        { quotaNormalizedSnapshot: { in: ['MANAGEMENT', 'PAID'] } },
        { quotaNameSnapshot: { contains: 'Management', mode: 'insensitive' } },
        { quotaNameSnapshot: { contains: 'Paid', mode: 'insensitive' } },
        { isManagement: true },
      ];
    } else if (q === 'INSTITUTIONAL' || q === 'INTERNAL') {
      return [
        { quotaNameSnapshot: { contains: 'Internal', mode: 'insensitive' } },
        {
          quotaNameSnapshot: { contains: 'Institutional', mode: 'insensitive' },
        },
      ];
    } else if (q === 'PWD') {
      return [
        { isPwd: true },
        { quotaNameSnapshot: { contains: 'PwD', mode: 'insensitive' } },
      ];
    } else {
      return [
        { quotaNameSnapshot: { equals: quota, mode: 'insensitive' } },
        { quotaNormalizedSnapshot: { equals: quota, mode: 'insensitive' } },
        { quotaShortNameSnapshot: { equals: quota, mode: 'insensitive' } },
      ];
    }
  }

  private getCategoryQueryConditions(category: string): any[] {
    const c = category.toUpperCase().trim();
    let normalizedGroup = '';

    if (c.startsWith('PWD-')) {
      const parts = c.split('-');
      normalizedGroup = parts[1];
    } else if (c === 'PWD') {
      normalizedGroup = '';
    } else {
      normalizedGroup = c;
    }

    if (normalizedGroup === 'GENERAL') {
      normalizedGroup = 'OPEN';
    } else if (normalizedGroup === 'OBC-NCL') {
      normalizedGroup = 'OBC';
    }

    const conditions: any[] = [];
    if (normalizedGroup) {
      if (normalizedGroup === 'OPEN') {
        conditions.push(
          {
            categoryRaw: {
              in: ['Open', 'OPEN', 'GEN', 'General', 'UR', 'Unreserved'],
            },
          },
          {
            categoryDisplay: {
              in: ['Open', 'OPEN', 'GEN', 'General', 'UR', 'Unreserved'],
            },
          },
          { categoryNormalized: 'OPEN' },
        );
      } else {
        conditions.push(
          { categoryRaw: { equals: normalizedGroup, mode: 'insensitive' } },
          { categoryDisplay: { equals: normalizedGroup, mode: 'insensitive' } },
          {
            categoryNormalized: {
              equals: normalizedGroup,
              mode: 'insensitive',
            },
          },
        );
      }
    }

    return conditions;
  }
}
