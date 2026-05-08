import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCounsellingOptionDto } from './dto/create-counselling.dto';
import { UpdateCounsellingOptionDto } from './dto/update-counselling.dto';

@Injectable()
export class CounsellingService {
  constructor(private prisma: PrismaService) {}

  async create(createCounsellingOptionDto: CreateCounsellingOptionDto) {
    const { bodies, ...counsellingData } = createCounsellingOptionDto;

    const result = await this.prisma.counsellingOption.create({
      data: {
        ...counsellingData,
        bodies: {
          create: (bodies || []).map((body) => ({
            key: body.key,
            name: body.name,
            counsellingType: body.counselling_type,
            state: body.state,
            websiteGoto: body.website_goto,
            websiteRegistration: body.website_registration,
            websiteProspectus: body.website_prospectus,
            isPinned: body.is_pinned || false,
            allotmentSessions: body.allotment_sessions || [],
            closingRankSessions: body.closing_rank_sessions || [],
            seatMatrixSessions: body.seat_matrix_sessions || [],
            feeStipendBondSessions: body.fee_stipend_bond_sessions || [],
            quotas: {
              create: (body.quotas || []).map((quota) => ({
                name: quota.name,
                shortName: quota.short_name,
                tooltipContent: quota.tooltip_content,
                tooltipContentHtml: quota.tooltip_content_html,
                masterQuota: quota.master_quota,
              })),
            },
          })),
        },
      },
      include: {
        bodies: {
          include: {
            quotas: true,
          },
        },
      },
    });

    return this.mapToResponse(result);
  }

  async findAll() {
    const results = await this.prisma.counsellingOption.findMany({
      include: {
        bodies: {
          include: {
            quotas: true,
          },
        },
      },
      orderBy: {
        label: 'asc',
      },
    });

    return results.map((res) => this.mapToResponse(res));
  }

  async findOne(id: string) {
    const result = await this.prisma.counsellingOption.findUnique({
      where: { id },
      include: {
        bodies: {
          include: {
            quotas: true,
          },
        },
      },
    });

    return this.mapToResponse(result);
  }

  async findByValue(value: string) {
    const result = await this.prisma.counsellingOption.findUnique({
      where: { value },
      include: {
        bodies: {
          include: {
            quotas: true,
          },
        },
      },
    });

    return this.mapToResponse(result);
  }

  async update(
    id: string,
    updateCounsellingOptionDto: UpdateCounsellingOptionDto,
  ) {
    const { bodies, ...counsellingData } = updateCounsellingOptionDto as any;

    // Delete existing bodies if new ones are provided
    if (bodies && bodies.length > 0) {
      await this.prisma.body.deleteMany({
        where: { optionId: id },
      });
    }

    const result = await this.prisma.counsellingOption.update({
      where: { id },
      data: {
        ...counsellingData,
        ...(bodies && {
          bodies: {
            create: bodies.map((body) => ({
              key: body.key,
              name: body.name,
              counsellingType: body.counselling_type,
              state: body.state,
              websiteGoto: body.website_goto,
              websiteRegistration: body.website_registration,
              websiteProspectus: body.website_prospectus,
              isPinned: body.is_pinned || false,
              allotmentSessions: body.allotment_sessions || [],
              closingRankSessions: body.closing_rank_sessions || [],
              seatMatrixSessions: body.seat_matrix_sessions || [],
              feeStipendBondSessions: body.fee_stipend_bond_sessions || [],
              quotas: {
                create: (body.quotas || []).map((quota) => ({
                  name: quota.name,
                  shortName: quota.short_name,
                  tooltipContent: quota.tooltip_content,
                  tooltipContentHtml: quota.tooltip_content_html,
                  masterQuota: quota.master_quota,
                })),
              },
            })),
          },
        }),
      },
      include: {
        bodies: {
          include: {
            quotas: true,
          },
        },
      },
    });

    return this.mapToResponse(result);
  }

  async remove(id: string) {
    return this.prisma.counsellingOption.delete({
      where: { id },
    });
  }

  private mapToResponse(option: any) {
    if (!option) return null;
    return {
      ...option,
      bodies: (option.bodies || []).map((body) => ({
        id: body.id,
        key: body.key,
        name: body.name,
        counselling_type: body.counsellingType,
        state: body.state,
        website_goto: body.websiteGoto,
        website_registration: body.websiteRegistration,
        website_prospectus: body.websiteProspectus,
        is_pinned: body.isPinned,
        allotment_sessions: body.allotmentSessions,
        closing_rank_sessions: body.closingRankSessions,
        seat_matrix_sessions: body.seatMatrixSessions,
        fee_stipend_bond_sessions: body.feeStipendBondSessions,
        quotas: (body.quotas || []).map((quota) => ({
          id: quota.id,
          name: quota.name,
          short_name: quota.shortName,
          tooltip_content: quota.tooltipContent,
          tooltip_content_html: quota.tooltipContentHtml,
          master_quota: quota.masterQuota,
        })),
      })),
    };
  }

}
