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
  ChoiceListSummaryResponseDto,
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
    // Check name uniqueness
    const existing = await this.prisma.choiceList.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictException('Choice list with this name already exists');
    }

    const choiceList = await this.prisma.choiceList.create({
      data: {
        userId,
        name: data.name,
        Caunselling: data.caunselling,
        ChoiceListDetails: data.details?.length
          ? {
              create: data.details.map((d) => ({
                name: d.name,
                Caunselling: d.caunselling,
                Institute: d.institute,
                Course: d.course,
                Quota: d.quota,
                Catagory: d.catagory,
                InsertAt: d.insertAt,
              })),
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
        throw new ConflictException('Choice list with this name already exists');
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.caunselling !== undefined) updateData.Caunselling = data.caunselling;

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
    if (data.caunselling !== undefined) updateData.Caunselling = data.caunselling;
    if (data.institute !== undefined) updateData.Institute = data.institute;
    if (data.course !== undefined) updateData.Course = data.course;
    if (data.quota !== undefined) updateData.Quota = data.quota;
    if (data.catagory !== undefined) updateData.Catagory = data.catagory;
    if (data.insertAt !== undefined) updateData.InsertAt = data.insertAt;

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
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
  }
}
