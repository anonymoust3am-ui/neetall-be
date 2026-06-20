import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetAllotmentsQueryDto } from './dto/get-allotments-query.dto';
import { Prisma, CounsellingLevel } from '@prisma/client';

@Injectable()
export class AllotmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllotments(queryDto: GetAllotmentsQueryDto) {
    const {
      page = 1,
      page_size = 50,
      session,
      counselling_level,
      rounds,
      institutes,
      courses,
      quotas,
      categories,
      states,
    } = queryDto;

    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(page_size) || 50;
    const sessionNum = session ? Number(session) : undefined;

    const skip = (pageNum - 1) * pageSizeNum;

    const where: Prisma.AllotmentRecordWhereInput = {};

    if (sessionNum) {
      where.sessionYear = sessionNum;
    }

    if (
      counselling_level &&
      Object.values(CounsellingLevel).includes(counselling_level as any)
    ) {
      where.counsellingLevel = counselling_level as CounsellingLevel;
    }

    if (rounds) {
      where.roundNo = {
        in: rounds.split(',').map((r) => parseFloat(r.trim())),
      };
    }

    if (institutes) {
      where.instituteId = { in: institutes.split(',').map((id) => id.trim()) };
    }

    if (courses) {
      where.courseId = { in: courses.split(',').map((id) => id.trim()) };
    }

    if (quotas) {
      where.quotaIdRef = { in: quotas.split(',').map((id) => id.trim()) };
    }

    if (categories) {
      where.categoryMapId = {
        in: categories.split(',').map((id) => id.trim()),
      };
    }

    if (states) {
      where.sourceStateName = { in: states.split(',').map((s) => s.trim()) };
    }

    const [total, records] = await Promise.all([
      this.prisma.allotmentRecord.count({ where }),
      this.prisma.allotmentRecord.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: {
          rank: 'asc', // Default order by rank
        },
        include: {
          institute: true,
          course: true,
          quota: true,
          categoryMap: true,
          counselling: true,
        },
      }),
    ]);

    const mappedRecords = records.map((record) => {
      return {
        id: record.id,
        round: record.roundRaw || String(record.roundNo),
        rank: record.rank,
        ai_rank: record.aiRank,
        counselling_rank: record.counsellingRank,
        institute: record.institute
          ? {
              id: record.institute.id,
              name: record.institute.name,
              short_name:
                record.instituteShortNameSnapshot || record.institute.name,
              logo_url: null, // Assuming no logo URL in standard schema
              district: record.instituteDistrictSnapshot,
            }
          : null,
        course: record.course
          ? {
              id: record.course.id,
              name: record.course.name,
              short_name: record.courseShortNameSnapshot || record.course.name,
            }
          : null,
        quota: record.quota
          ? {
              id: record.quota.id,
              name: record.quota.name,
              short_name: record.quotaShortNameSnapshot || record.quota.name,
              master_quota: record.masterQuotaSnapshot,
            }
          : null,
        category: record.categoryDisplay || record.categoryRaw,
        state: record.sourceStateName,
        counselling: record.counselling
          ? {
              id: record.counselling.id,
              name: record.counselling.name,
              short_name: record.counselling.name,
            }
          : null,
        inservice_candidate: record.inserviceCandidate,
        candidate_flag: record.candidateFlag,
        fee_id: record.sourceFeeId,
        fee: record.feeRaw,
        stipend_year_1: record.stipendYear1Raw,
        bond_years: record.bondYearsRaw || String(record.bondYearsNumber),
        bond_penalty: record.bondPenaltyRaw,
        beds: record.bedsRaw || String(record.bedsCount),
        choice_list_count: record.choiceListCount || 0,
      };
    });

    const remarksHtml = `<p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 8pt; margin-left: 36pt; line-height: 107%; font-size: 15px; font-family: 'Nunito Sans', sans-serif; text-align: center; text-indent: -18pt;">\r    <strong>\r        <u><span style="font-size: 21px; line-height: 107%; font-family: 'Nunito Sans';">All India Counseling - UG Medical</span></u>\r    </strong>\r</p>\r<p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 8pt; margin-left: 0cm; line-height: 107%; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r    <strong>\r\r                <u><span style="font-family: 'Nunito Sans'; color: #0070c0;">Quotas within All India Counseling & Eligibility </span></u>\r    </strong>\r</p>\r<table style="border: none; width: 540pt; margin-left: 18pt; border-collapse: collapse;">\r    <tbody>\r        <tr>\r            <td style="width: 150pt; border: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;"><b>Quota</b></span>\r                </p>\r            </td>\r            <td\r                style="\r                    width: 373.2pt;\r                    border-top: 1pt solid windowtext;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-image: initial;\r                    border-left: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;"><b>Description / Eligibility </b> </span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td style="width: 150pt; border: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AIQ</span>\r                </p>\r            </td>\r            <td\r                style="\r                    width: 373.2pt;\r                    border-top: 1pt solid windowtext;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-image: initial;\r                    border-left: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - All India Quota (All qualified candidates eligible) </span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        \r        <tr>\r            <td style="width: 150pt; border: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AIIMS - Open</span>\r                </p>\r            </td>\r            <td\r                style="\r                    width: 373.2pt;\r                    border-top: 1pt solid windowtext;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-image: initial;\r                    border-left: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - AIIMS (All qualified candidates across India eligible)</span>\r                </p>\r            </td>\r        </tr>\r\r        \r        \r        <tr>\r            <td style="width: 150pt; border: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AIIMS - Foreign Nationals </span>\r                </p>\r            </td>\r            <td\r                style="\r                    width: 373.2pt;\r                    border-top: 1pt solid windowtext;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-image: initial;\r                    border-left: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Foreign National Seats - OCI/PIO/Foreign Nationals Eligible</span>\r                </p>\r            </td>\r        </tr>\r\r        \r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AMU-Internal</span>\r                </p>\r            </td>\r            \r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r            \r       \r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Aligarh Muslim University&apos;s Internal Quota (Candidate's who completed qualifying examination from AMU in the past 3 years are eligible)</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AMU - Open</span>\r                </p>\r            </td>\r            \r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r            \r       \r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - AMU (All qualified candidates across India eligible)\r\r</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">AMU - NRI</span>\r                </p>\r            </td>\r            \r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r            \r       \r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Aligarh Muslim University&apos;s NRI Seats (Eligiblity as per defined NRI Criteria)</span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r             \r             \r             <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">BHU - Open</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - BHU (All qualified candidates across India eligible)\r</span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Delhi Univ - Delhi CW</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">DU Quota for Children / Widows of Personnel of Armed Forces</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        \r        \r     <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Delhi Univ - DU Quota (State) </span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">85% Delhi DU Quota for candidates who have passed 11th and 12th Standard examination from Delhi NCT</span>\r                </p>\r            </td>\r        </tr>\r           \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">IP Univ - IP CW</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">IP Quota for Children / Widows of Personnel of Armed Forces</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        \r        \r     <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">IP Univ - IP Quota (State) </span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">85% Delhi IP Quota for candidates who have passed 11th and 12th Standard examination from Delhi NCT</span>\r                </p>\r            </td>\r        </tr>\r           \r        \r        \r        \r        \r        \r     <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">ESI - Insured Persons</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Candidates who are ward of insured persons (Should have an Ward of IP Certificate)</span>\r                </p>\r            </td>\r        </tr>\r           \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 90pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">JIPMER - Open</span>\r                </p>\r            </td>\r            <td style="width: 700pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - JIPMER (All qualified candidates across India eligible)\r\r</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 90pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">JIPMER - Pondicherry Domicile</span>\r                </p>\r            </td>\r            <td style="width: 700pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">JIPMER seats for Pondicherry domiciles as per eligiblity Criteria\r</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Jamia - Open</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;">Open Seats - Jamia (All qualified candidates across India eligible) </span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Jamia - Internal</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Candidates who have passed qualifying examination from Jamia Schools as regular students</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Jamia - Muslim</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Muslim Minority candidates are eligible</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        \r         \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Jamia - Muslim Women</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Muslim Minority Women candidates are eligible</span>\r                </p>\r            </td>\r        </tr>\r        \r        \r        \r        \r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Deemed Univ - Jain Minority</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Jain Minority seats in 2 Institutes, SBKS Medical, Vadodara / KM Shah Dental, Vadodara</span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Deemed - Muslim Minority</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Muslim Minority seats in 3 Institutes - Yenepoya Medical, Mangalore / Yenepoya Dental, Mangalore / Hamdard, Delhi</span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Deemed - Paid Seats (PS)</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: blue;"> Management Quota seats (Paid seats) under Deemed Universities (All qualified candidates across India eligible) </span>\r                </p>\r            </td>\r        </tr>\r        <tr>\r            <td\r                style="\r                    width: 150pt;\r                    border-right: 1pt solid windowtext;\r                    border-bottom: 1pt solid windowtext;\r                    border-left: 1pt solid windowtext;\r                    border-image: initial;\r                    border-top: none;\r                    padding: 0cm 5.4pt;\r                    height: 14.4pt;\r                    vertical-align: middle;\r                "\r            >\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">Deemed - NRI</span>\r                </p>\r            </td>\r            <td style="width: 373.2pt; border-top: none; border-left: none; border-bottom: 1pt solid windowtext; border-right: 1pt solid windowtext; padding: 0cm 5.4pt; height: 14.4pt; vertical-align: middle;">\r                <p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 0cm; margin-left: 0cm; line-height: normal; font-size: 15px; font-family: 'Nunito Sans', sans-serif;">\r                    <span style="font-family: 'Nunito Sans'; color: black;">NRI Quota under Deemed Universities (Eligiblity as per defined NRI Criteria)</span>\r                </p>\r            </td>\r        </tr>\r        \r    </tbody>\r</table>\r<p style="margin-top: 0cm; margin-right: 0cm; margin-bottom: 8pt; margin-left: 0cm; line-height: 107%; font-size: 15px; font-family: 'Nunito Sans', sans-serif;"><span style="font-family: 'Nunito Sans';">&nbsp;</span></p>\r`;

    return {
      success: true,
      message: 'success',
      data: {
        selected_session: session ? String(session) : undefined,
        headers: [
          {
            name: 'Round',
            key: 'round',
            sortable: true,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'AI Rank',
            key: 'rank',
            sortable: true,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'State',
            key: 'state',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Institute',
            key: 'institute',
            sortable: false,
            hyperlink: true,
            use_short_name: true,
            hyperlink_properties: {
              type: 'redirect',
              show: 'institute',
            },
          },
          {
            name: 'Course',
            key: 'course',
            sortable: false,
            hyperlink: false,
            use_short_name: true,
          },
          {
            name: 'Quota',
            key: 'quota',
            sortable: false,
            hyperlink: false,
            use_short_name: true,
          },
          {
            name: 'Category',
            key: 'category',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Fee',
            key: 'fee',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Beds',
            key: 'beds',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Bond Years',
            key: 'bond_years',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Bond Penalty',
            key: 'bond_penalty',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
          {
            name: 'Stipend Year 1',
            key: 'stipend_year_1',
            sortable: false,
            hyperlink: false,
            use_short_name: false,
          },
        ],
        records: mappedRecords,
        access_state: 'LIMITED',
        total: total,
        page_size: pageSizeNum,
        show_rank_switch: false,
        remarks_content: remarksHtml,
        remarks: {
          type: 'HTML',
          html: remarksHtml,
        },
        table_comments: [
          'Click on the record for detailed information and factors.',
          '(*) Indicates additional remarks available in Details & Factors.',
        ],
        is_group: false,
        candidate_flags: {
          inservice_candidate: {
            color: 'blue',
            label: 'Inservice Candidates with Incentives',
          },
          nri_priority_1: {
            color: 'yellow',
            label: 'NRI Quota - Priority 1',
          },
          nri_priority_2: {
            color: 'brown',
            label: 'NRI Quota - Priority 2',
          },
          SCG_S2_Karnataka: {
            color: 'pink',
            label: 'SCB Category Candidates',
          },
          SCG_S3_Karnataka: {
            color: 'purple',
            label: 'SCC Category Candidates',
          },
          SCG_S1_Karnataka: {
            color: 'turquoise',
            label: 'SCA Category Candidates',
          },
          SCH_S1_Karnataka: {
            color: 'gray',
            label: 'SCA Category Hyd-Karnataka Candidates',
          },
          SCH_S3_Karnataka: {
            color: 'violet',
            label: 'SCC Category Hyd-Karnataka Candidates',
          },
          SCH_S2_Karnataka: {
            color: 'green',
            label: 'SCB Category Hyd-Karnataka Candidates',
          },
          SC1_FEM_Andhra: {
            color: 'pink',
            label: 'SC-FEM Group 1 Candidates',
          },
          SC2_FEM_Andhra: {
            color: 'purple',
            label: 'SC-FEM Group 2 Candidates',
          },
          SC3_FEM_Andhra: {
            color: 'turquoise',
            label: 'SC-FEM Group 3 Candidates',
          },
          SC1_GEN_Andhra: {
            color: 'gray',
            label: 'SC-GEN Group 1 Candidates',
          },
          SC2_GEN_Andhra: {
            color: 'violet',
            label: 'SC-GEN Group 2 Candidates',
          },
          SC3_GEN_Andhra: {
            color: 'green',
            label: 'SC-GEN Group 3 Candidates',
          },
          SC1_FEM_Telangana: {
            color: 'pink',
            label: 'SC-FEM Group 1 Candidates',
          },
          SC2_FEM_Telangana: {
            color: 'purple',
            label: 'SC-FEM Group 2 Candidates',
          },
          SC3_FEM_Telangana: {
            color: 'turquoise',
            label: 'SC-FEM Group 3 Candidates',
          },
          SC1_GEN_Telangana: {
            color: 'gray',
            label: 'SC-GEN Group 1 Candidates',
          },
          SC2_GEN_Telangana: {
            color: 'violet',
            label: 'SC-GEN Group 2 Candidates',
          },
          SC3_GEN_Telangana: {
            color: 'green',
            label: 'SC-GEN Group 3 Candidates',
          },
          mp_institutional_seat: {
            color: 'purple',
            label: 'Institutional Seats',
          },
          mp_institutional_seat_inservice_candidate: {
            color: 'yellow',
            label: 'Institutional Seats with Incentive',
          },
          mp_non_institutional_seat_inservice_candidate: {
            color: 'blue',
            label: 'Non-Institutional Seats with Incentive',
          },
          mp_non_institutional_seat: {
            color: 'gray',
            label: 'Non-Institutional Seats',
          },
        },
      },
    };
  }
}
