import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  marksToRank,
  cleanInt,
  formatBucketByClosingRank,
  getGradient,
  getLogoColor,
  balancedCards,
  shortName,
} from './predictor.utils';

@Injectable()
export class PredictorService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Options (Dropdowns) APIs
  // ==========================================
  async getStates() {
    try {
      const states = await this.prisma.state.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          code: true,
        }
      });
      return { success: true, data: states };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getAiOptions(query: any) {
    try {
      // MongoDB distinct via Prisma aggregateRaw is fastest for dropdowns
      const roundsRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: { counsellingLevel: 'ALL_INDIA' } },
          { $group: { _id: "$roundNo", label: { $first: "$roundNo" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const coursesRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: { counsellingLevel: 'ALL_INDIA' } },
          { $group: { _id: "$courseNameSnapshot" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const categoriesRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: { counsellingLevel: 'ALL_INDIA' } },
          { $group: { _id: "$categoryNormalized" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const quotasRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: { counsellingLevel: 'ALL_INDIA' } },
          { $group: { _id: "$quotaNormalizedSnapshot" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      return {
        success: true,
        data: {
          rounds: roundsRaw.map((r: any) => ({ round_no: r._id, label: r.label || r._id })).filter((r: any) => r.round_no != null),
          courses: coursesRaw.map((r: any) => ({ course_code: r._id })).filter((r: any) => r.course_code != null),
          categories: categoriesRaw.map((r: any) => ({ candidate_category_code: r._id })).filter((r: any) => r.candidate_category_code != null),
          quotas: quotasRaw.map((r: any) => ({ quota_code: r._id })).filter((r: any) => r.quota_code != null),
        }
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getStateOptions(stateSlug: string, query: any) {
    try {
      const matchOptions = { counsellingLevel: 'STATE', instituteStateSlugSnapshot: stateSlug };
      
      const roundsRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchOptions },
          { $group: { _id: "$roundNo", label: { $first: "$roundNo" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const coursesRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchOptions },
          { $group: { _id: "$courseNameSnapshot" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const categoriesRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchOptions },
          { $group: { _id: "$categoryNormalized" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const quotasRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchOptions },
          { $group: { _id: "$quotaNameSnapshot" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const institutesRaw = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchOptions },
          { $group: { _id: "$instituteNameSnapshot", shortName: { $first: "$instituteShortNameSnapshot" }, id: { $first: "$instituteId" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      return {
        success: true,
        data: {
          rounds: roundsRaw.map((r: any) => ({ round_no: r._id, label: r.label || r._id })).filter((r: any) => r.round_no != null),
          courses: coursesRaw.map((r: any) => ({ course_code: r._id })).filter((r: any) => r.course_code != null),
          categories: categoriesRaw.map((r: any) => ({ candidate_category_code: r._id })).filter((r: any) => r.candidate_category_code != null),
          quotas: quotasRaw.map((r: any) => ({ quota_code: r._id })).filter((r: any) => r.quota_code != null),
          institutes: institutesRaw.map((r: any) => ({ institute_name: r._id, institute_short_name: r.shortName, institute_id: r.id })).filter((r: any) => r.institute_name != null),
        }
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // ==========================================
  // Predict APIs
  // ==========================================
  
  async predictAi(body: any) {
    try {
      let inputRank = cleanInt(body.rank);
      if (!inputRank && body.marks) {
        inputRank = marksToRank(cleanInt(body.marks));
      }
      if (!inputRank) throw new Error("Rank or marks required.");

      const limit = cleanInt(body.limit) || 30;
      const nearbyRange = cleanInt(body.nearby_range) || 25000;

      const minRank = Math.max(1, inputRank - nearbyRange);
      const maxRank = inputRank + nearbyRange;

      const matchStage: any = { counsellingLevel: 'ALL_INDIA', rank: { $gte: minRank, $lte: maxRank } };

      if (body.round_no && body.round_no !== 'all' && body.round_no !== 'latest') matchStage.roundNo = Number(body.round_no);
      if (body.course_code) matchStage.courseNameSnapshot = body.course_code;
      if (body.candidate_category_code) matchStage.categoryNormalized = body.candidate_category_code;
      if (body.quota_code) matchStage.quotaNormalizedSnapshot = body.quota_code;

      const results = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rank", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$instituteNameSnapshot",
              instituteId: { $first: "$instituteId" },
              courseCode: { $first: "$courseNameSnapshot" },
              openingRank: { $min: "$rank" },
              closingRank: { $max: "$rank" },
              rankGap: { $first: { $subtract: ["$rank", inputRank] } }, // Dist to nearest
              nearestRank: { $first: "$rank" },
              rounds: { $addToSet: "$roundNo" },
              quotaCodes: { $addToSet: "$quotaNormalizedSnapshot" },
              candidateCategoryCodes: { $addToSet: "$categoryNormalized" },
              allottedCategoryCodes: { $addToSet: "$categoryDisplay" },
              similarCandidates: {
                $push: {
                  rank_num: "$rank",
                  round_no: "$roundNo",
                  candidate_category_code: "$categoryNormalized",
                  allotted_category_code: "$categoryDisplay",
                  quota_code: "$quotaNormalizedSnapshot",
                  rankDist: "$rankDist"
                }
              }
            }
          }
        ]
      }) as unknown as any[];

      const formatted = results.map(row => {
        const sortedCandidates = row.similarCandidates.sort((a: any, b: any) => a.rankDist - b.rankDist).slice(0, 4);
        const closingRank = row.closingRank || 0;
        const bucket = formatBucketByClosingRank(inputRank, closingRank);

        return {
          name: row._id,
          shortName: shortName(row._id),
          courseName: row.courseCode,
          courseCode: row.courseCode,
          rounds: row.rounds.sort().join(", "),
          quotaCodes: row.quotaCodes.filter(Boolean).join(", "),
          candidateCategoryCodes: row.candidateCategoryCodes.filter(Boolean).join(", "),
          allottedCategoryCodes: row.allottedCategoryCodes.filter(Boolean).join(", "),
          openingRank: row.openingRank,
          closingRank: row.closingRank,
          rankGap: row.closingRank - inputRank,
          bucket: bucket,
          logoColor: getLogoColor(bucket),
          image: getGradient(bucket),
          inputRank: inputRank,
          similarCandidates: sortedCandidates
        };
      });

      const balanced = balancedCards(formatted, limit);

      return {
        success: true,
        mode: 'ai',
        summary: {
          userRank: inputRank,
          totalCards: formatted.length,
          nearbyRange: nearbyRange,
          safe: formatted.filter(x => x.bucket === 'safe').length,
          target: formatted.filter(x => x.bucket === 'target').length,
          dream: formatted.filter(x => x.bucket === 'dream').length,
          title: "All India MCC prediction",
        },
        data: balanced
      };

    } catch(e: any) {
      return { success: false, message: e.message };
    }
  }

  async predictState(stateSlug: string, body: any) {
    try {
      let inputRank = cleanInt(body.rank);
      if (!inputRank && body.marks) {
        inputRank = marksToRank(cleanInt(body.marks));
      }
      if (!inputRank) throw new Error("Rank or marks required.");

      const limit = cleanInt(body.limit) || 30;
      const nearbyRange = cleanInt(body.nearby_range) || 25000;

      const minRank = Math.max(1, inputRank - nearbyRange);
      const maxRank = inputRank + nearbyRange;

      const matchStage: any = { counsellingLevel: 'STATE', instituteStateSlugSnapshot: stateSlug, rank: { $gte: minRank, $lte: maxRank } };

      if (body.round_no && body.round_no !== 'all' && body.round_no !== 'latest') matchStage.roundNo = Number(body.round_no);
      if (body.course_code) matchStage.courseNameSnapshot = body.course_code;
      if (body.candidate_category_code) matchStage.categoryNormalized = body.candidate_category_code;
      if (body.quota_code) matchStage.quotaNameSnapshot = body.quota_code;
      if (body.institute_name) matchStage.instituteNameSnapshot = body.institute_name;

      const results = await this.prisma.allotmentRecord.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rank", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$instituteNameSnapshot",
              instituteId: { $first: "$instituteId" },
              courseCode: { $first: "$courseNameSnapshot" },
              state: { $first: "$instituteStateSnapshot" },
              openingRank: { $min: "$rank" },
              closingRank: { $max: "$rank" },
              counsellingRankOpening: { $min: "$counsellingRank" },
              counsellingRankClosing: { $max: "$counsellingRank" },
              rankGap: { $first: { $subtract: ["$rank", inputRank] } },
              nearestRank: { $first: "$rank" },
              rounds: { $addToSet: "$roundNo" },
              quotaCodes: { $addToSet: "$quotaNameSnapshot" },
              candidateCategoryCodes: { $addToSet: "$categoryNormalized" },
              allottedCategoryCodes: { $addToSet: "$categoryDisplay" },
              totalSimilarRows: { $sum: 1 },
              similarCandidates: {
                $push: {
                  rank_num: "$rank",
                  counselling_rank: "$counsellingRank",
                  round_no: "$roundNo",
                  candidate_category_code: "$categoryNormalized",
                  allotted_category_code: "$categoryDisplay",
                  quota_code: "$quotaNameSnapshot",
                  rankDist: "$rankDist"
                }
              }
            }
          }
        ]
      }) as unknown as any[];

      const formatted = results.map(row => {
        const sortedCandidates = row.similarCandidates.sort((a: any, b: any) => a.rankDist - b.rankDist).slice(0, 4);
        const closingRank = row.closingRank || 0;
        const bucket = formatBucketByClosingRank(inputRank, closingRank);

        return {
          name: row._id,
          shortName: shortName(row._id),
          courseName: row.courseCode,
          courseCode: row.courseCode,
          state: row.state,
          rounds: row.rounds.sort().join(", "),
          quotaCodes: row.quotaCodes.filter(Boolean).join(", "),
          candidateCategoryCodes: row.candidateCategoryCodes.filter(Boolean).join(", "),
          allottedCategoryCodes: row.allottedCategoryCodes.filter(Boolean).join(", "),
          openingRank: row.openingRank,
          closingRank: row.closingRank,
          counsellingRankOpening: row.counsellingRankOpening,
          counsellingRankClosing: row.counsellingRankClosing,
          rankGap: row.closingRank - inputRank,
          bucket: bucket,
          logoColor: getLogoColor(bucket),
          image: getGradient(bucket),
          inputRank: inputRank,
          totalSimilarRows: row.totalSimilarRows,
          similarCandidates: sortedCandidates
        };
      });

      const balanced = balancedCards(formatted, limit);

      return {
        success: true,
        mode: stateSlug,
        summary: {
          userRank: inputRank,
          totalCards: formatted.length,
          nearbyRange: nearbyRange,
          safe: formatted.filter(x => x.bucket === 'safe').length,
          target: formatted.filter(x => x.bucket === 'target').length,
          dream: formatted.filter(x => x.bucket === 'dream').length,
          title: `${stateSlug.toUpperCase()} state prediction`,
        },
        data: balanced
      };

    } catch(e: any) {
      return { success: false, message: e.message };
    }
  }

}
