import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  marksToRank,
  cleanInt,
  cleanText,
  formatBucketByClosingRank,
  formatBucketByNearestRank,
  bucketPriority,
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
  async getAiOptions(query: any) {
    try {
      const matchOptions: any = { counsellingType: 'ALL_INDIA' };
      if (query.round_no && query.round_no !== 'all' && query.round_no !== 'latest') {
        // Find the matching round ID if needed, but our migration set roundNo directly in extraDetails or we can use round relations.
        // Actually, schema has `roundId` and `round`, but the fastest way to get distinct rounds is from the Cutoff or Allotment table.
        // Wait, for options it's easier to aggregate.
      }

      // MongoDB distinct via Prisma aggregateRaw is fastest for dropdowns
      const roundsRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'ALL_INDIA' } },
          { $group: { _id: "$roundNo", label: { $first: "$extraDetails.round_no" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const coursesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'ALL_INDIA' } },
          { $group: { _id: "$courseNameRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const categoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'ALL_INDIA' } },
          { $group: { _id: "$candidateCategoryRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const quotasRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'ALL_INDIA' } },
          { $group: { _id: "$quotaRaw" } },
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

  async getMhOptions(query: any) {
    try {
      const statesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$extraDetails.state_code" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const coursesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$courseNameRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const sessionsRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$extraDetails.session_year" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const stateCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$extraDetails.state_reservation_category_code" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const otherReservationsRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$otherReservationCode" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const seatTypesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$seatReservationTypeCode" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const candidateCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'MH' } },
          { $group: { _id: "$candidateCategoryRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];


      return {
        success: true,
        data: {
          states: statesRaw.map((r: any) => ({ state_code: r._id })).filter((r: any) => r.state_code != null),
          courses: coursesRaw.map((r: any) => ({ course_name: r._id })).filter((r: any) => r.course_name != null),
          sessions: sessionsRaw.map((r: any) => ({ session_year: r._id })).filter((r: any) => r.session_year != null),
          stateCategories: stateCategoriesRaw.map((r: any) => ({ code: r._id })).filter((r: any) => r.code != null),
          otherReservations: otherReservationsRaw.map((r: any) => ({ code: r._id })).filter((r: any) => r.code != null),
          seatTypes: seatTypesRaw.map((r: any) => ({ code: r._id })).filter((r: any) => r.code != null),
          candidateCategories: candidateCategoriesRaw.map((r: any) => ({ code: r._id })).filter((r: any) => r.code != null),
        }
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getGjOptions(query: any) {
    try {
      const roundsRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'GJ' } },
          { $group: { _id: "$extraDetails.actual_round_no", label: { $first: "$extraDetails.actual_round_no" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const candidateCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'GJ' } },
          { $group: { _id: "$candidateCategoryRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const admCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'GJ' } },
          { $group: { _id: "$allottedCategoryRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const quotasRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'GJ' } },
          { $group: { _id: "$quotaRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const institutesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'GJ' } },
          { $group: { _id: "$collegeCodeRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];


      return {
        success: true,
        data: {
          rounds: roundsRaw.map((r: any) => ({ round_no: r._id, label: r.label || r._id })).filter((r: any) => r.round_no != null),
          candidateCategories: candidateCategoriesRaw.map((r: any) => ({ candidate_category_code: r._id })).filter((r: any) => r.candidate_category_code != null),
          admCategories: admCategoriesRaw.map((r: any) => ({ adm_category_code: r._id })).filter((r: any) => r.adm_category_code != null),
          quotas: quotasRaw.map((r: any) => ({ quota_code: r._id })).filter((r: any) => r.quota_code != null),
          institutes: institutesRaw.map((r: any) => ({ institute_code: r._id })).filter((r: any) => r.institute_code != null),
        }
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getUpOptions(query: any) {
    try {
      const roundsRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$extraDetails.round_no", label: { $first: "$extraDetails.round_no" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const coursesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$courseNameRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const baseCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$extraDetails.allotted_category_base_code" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const seatTypesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$seatReservationTypeCode" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const fullCategoriesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$allottedCategoryRaw" } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];

      const institutesRaw = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: { counsellingType: 'UP' } },
          { $group: { _id: "$collegeCodeRaw", name: { $first: "$instituteNameRaw" } } },
          { $sort: { _id: 1 } }
        ]
      }) as unknown as any[];


      return {
        success: true,
        data: {
          rounds: roundsRaw.map((r: any) => ({ round_no: r._id, label: r.label || r._id })).filter((r: any) => r.round_no != null),
          courses: coursesRaw.map((r: any) => ({ course_code: r._id })).filter((r: any) => r.course_code != null),
          baseCategories: baseCategoriesRaw.map((r: any) => ({ allotted_category_base_code: r._id })).filter((r: any) => r.allotted_category_base_code != null),
          seatTypes: seatTypesRaw.map((r: any) => ({ seat_reservation_type_code: r._id })).filter((r: any) => r.seat_reservation_type_code != null),
          categories: fullCategoriesRaw.map((r: any) => ({ allotted_category_code: r._id, allotted_category_display: r._id })).filter((r: any) => r.allotted_category_code != null),
          institutes: institutesRaw.map((r: any) => ({ institute_code: r._id, institute_name: r.name })).filter((r: any) => r.institute_code != null),
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

      const matchStage: any = { counsellingType: 'ALL_INDIA', rankNum: { $gte: minRank, $lte: maxRank } };

      if (body.round_no && body.round_no !== 'all' && body.round_no !== 'latest') matchStage['extraDetails.round_no'] = body.round_no;
      if (body.course_code) matchStage.courseNameRaw = body.course_code;
      if (body.candidate_category_code) matchStage.candidateCategoryRaw = body.candidate_category_code;
      if (body.quota_code) matchStage.quotaRaw = body.quota_code;

      const results = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rankNum", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$instituteNameRaw",
              instituteId: { $first: "$instituteId" },
              courseCode: { $first: "$courseNameRaw" },
              openingRank: { $min: "$rankNum" },
              closingRank: { $max: "$rankNum" },
              rankGap: { $first: { $subtract: ["$rankNum", inputRank] } }, // Dist to nearest
              nearestRank: { $first: "$rankNum" },
              rounds: { $addToSet: "$extraDetails.round_no" },
              quotaCodes: { $addToSet: "$quotaRaw" },
              candidateCategoryCodes: { $addToSet: "$candidateCategoryRaw" },
              allottedCategoryCodes: { $addToSet: "$allottedCategoryRaw" },
              similarCandidates: {
                $push: {
                  rank_num: "$rankNum",
                  round_no: "$extraDetails.round_no",
                  candidate_category_code: "$candidateCategoryRaw",
                  allotted_category_code: "$allottedCategoryRaw",
                  quota_code: "$quotaRaw",
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


  async predictMh(body: any) {
    try {
      let inputRank = cleanInt(body.rank);
      if (!inputRank && body.marks) {
        inputRank = marksToRank(cleanInt(body.marks));
      }
      if (!inputRank) throw new Error("Rank or marks required.");

      const limit = cleanInt(body.limit) || 30;
      const nearbyRange = cleanInt(body.rank_range) || 10000;

      const minRank = Math.max(1, inputRank - nearbyRange);
      const maxRank = inputRank + nearbyRange;

      const matchStage: any = { counsellingType: 'MH', rankNum: { $gte: minRank, $lte: maxRank } };

      if (body.state_code) matchStage['extraDetails.state_code'] = body.state_code;
      if (body.course_name) matchStage.courseNameRaw = body.course_name;
      if (body.session_year) matchStage['extraDetails.session_year'] = body.session_year;
      if (body.candidate_category_code) matchStage.candidateCategoryRaw = body.candidate_category_code;
      if (body.state_reservation_category_code) matchStage['extraDetails.state_reservation_category_code'] = body.state_reservation_category_code;
      if (body.other_reservation_code) matchStage.otherReservationCode = body.other_reservation_code;
      if (body.seat_reservation_type_codes && body.seat_reservation_type_codes.length) {
        matchStage.seatReservationTypeCode = { $in: body.seat_reservation_type_codes };
      }

      const results = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rankNum", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$collegeCodeRaw", // For MH we group by collegeCodeRaw
              collegeCode: { $first: "$collegeCodeRaw" },
              name: { $first: "$instituteNameRaw" },
              state: { $first: "$extraDetails.state_code" },
              sessionYear: { $first: "$extraDetails.session_year" },
              courseName: { $first: "$courseNameRaw" },
              totalSimilarRows: { $sum: 1 },
              bestSimilarRank: { $min: "$rankNum" },
              worstSimilarRank: { $max: "$rankNum" },
              nearestRank: { $first: "$rankNum" }, // Since we sorted by rankDist, the first is nearest
              seatTypesArr: { $push: "$seatReservationTypeCode" },
              rawCandidates: {
                $push: {
                  rank_num: "$rankNum",
                  round_no: "$extraDetails.round_no",
                  state_reservation_category_code: "$extraDetails.state_reservation_category_code",
                  other_reservation_code: "$otherReservationCode",
                  seat_reservation_type_code: "$seatReservationTypeCode",
                  rankDist: "$rankDist"
                }
              }
            }
          }
        ]
      }) as unknown as any[];

      const formatted = results.map(row => {
        const sortedCandidates = row.rawCandidates.sort((a: any, b: any) => a.rankDist - b.rankDist).slice(0, 4);
        
        const seatTypeCounts: Record<string, number> = {};
        for(const st of row.seatTypesArr) {
            if(st) seatTypeCounts[st] = (seatTypeCounts[st] || 0) + 1;
        }
        const seatTypeBreakdown = Object.entries(seatTypeCounts).map(([code, count]) => ({code, count}));

        const matchedFiltersCount: Record<string, number> = {};
        for(const c of row.rawCandidates) {
            const key = `${c.state_reservation_category_code || '-'}||${c.other_reservation_code || '-'}||${c.seat_reservation_type_code || '-'}`;
            matchedFiltersCount[key] = (matchedFiltersCount[key] || 0) + 1;
        }

        const matchedFilters = Object.entries(matchedFiltersCount).map(([key, count]) => {
            const [sc, oc, st] = key.split('||');
            return { stateCategory: sc, otherReservation: oc, seatType: st, count };
        }).sort((a,b) => b.count - a.count);

        const bucket = formatBucketByNearestRank(inputRank, row.nearestRank);

        return {
          name: row.name || `College ${row.collegeCode}`,
          shortName: shortName(row.name || `College ${row.collegeCode}`),
          collegeCode: row.collegeCode,
          state: row.state,
          sessionYear: row.sessionYear,
          courseName: row.courseName,
          totalSimilarRows: row.totalSimilarRows,
          bestSimilarRank: row.bestSimilarRank,
          worstSimilarRank: row.worstSimilarRank,
          nearestRank: row.nearestRank,
          rankGap: row.nearestRank - inputRank,
          bucket: bucket,
          logoColor: getLogoColor(bucket),
          image: getGradient(bucket),
          inputRank: inputRank,
          seatTypeBreakdown: seatTypeBreakdown,
          matchedFilters: matchedFilters,
          similarCandidates: sortedCandidates
        };
      });

      const balanced = balancedCards(formatted, limit);

      return {
        success: true,
        mode: 'mh',
        summary: {
          userRank: inputRank,
          totalCards: formatted.length,
          rankRange: `±${nearbyRange.toLocaleString('en-IN')}`,
          safe: formatted.filter(x => x.bucket === 'safe').length,
          target: formatted.filter(x => x.bucket === 'target').length,
          dream: formatted.filter(x => x.bucket === 'dream').length,
          title: "Maharashtra state prediction",
        },
        data: balanced
      };

    } catch(e: any) {
      return { success: false, message: e.message };
    }
  }


  async predictGj(body: any) {
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

      const matchStage: any = { counsellingType: 'GJ', rankNum: { $gte: minRank, $lte: maxRank } };

      if (body.actual_round_no && body.actual_round_no !== 'all' && body.actual_round_no !== 'latest') matchStage['extraDetails.actual_round_no'] = body.actual_round_no;
      if (body.candidate_category_code) matchStage.candidateCategoryRaw = body.candidate_category_code;
      if (body.adm_category_code) matchStage.allottedCategoryRaw = body.adm_category_code;
      if (body.quota_code) matchStage.quotaRaw = body.quota_code;
      if (body.institute_code) matchStage.collegeCodeRaw = body.institute_code;

      const results = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rankNum", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$collegeCodeRaw",
              instituteId: { $first: "$instituteId" },
              instituteName: { $first: "$instituteNameRaw" },
              openingRank: { $min: "$rankNum" },
              closingRank: { $max: "$rankNum" },
              openingMeritNo: { $min: "$meritNo" },
              closingMeritNo: { $max: "$meritNo" },
              maxNeetScore: { $max: "$neetScore" },
              minNeetScore: { $min: "$neetScore" },
              nearestRank: { $first: "$rankNum" },
              rounds: { $addToSet: "$extraDetails.actual_round_no" },
              quotaCodes: { $addToSet: "$quotaRaw" },
              candidateCategoryCodes: { $addToSet: "$candidateCategoryRaw" },
              admCategoryCodes: { $addToSet: "$allottedCategoryRaw" },
              similarCandidates: {
                $push: {
                  rank_num: "$rankNum",
                  merit_no: "$meritNo",
                  neet_score: "$neetScore",
                  round_no: "$extraDetails.actual_round_no",
                  candidate_category_code: "$candidateCategoryRaw",
                  adm_category_code: "$allottedCategoryRaw",
                  quota_code: "$quotaRaw",
                  college_code: "$collegeCodeRaw",
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
        const name = row.instituteName || `College ${row._id}`;

        return {
          name: name,
          shortName: shortName(name),
          collegeCode: row._id,
          instituteCode: row._id,
          rounds: row.rounds.sort().join(", "),
          quotaCodes: row.quotaCodes.filter(Boolean).join(", "),
          candidateCategoryCodes: row.candidateCategoryCodes.filter(Boolean).join(", "),
          admCategoryCodes: row.admCategoryCodes.filter(Boolean).join(", "),
          openingRank: row.openingRank,
          closingRank: row.closingRank,
          openingMeritNo: row.openingMeritNo,
          closingMeritNo: row.closingMeritNo,
          maxNeetScore: row.maxNeetScore,
          minNeetScore: row.minNeetScore,
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
        mode: 'gj',
        summary: {
          userRank: inputRank,
          totalCards: formatted.length,
          nearbyRange: nearbyRange,
          safe: formatted.filter(x => x.bucket === 'safe').length,
          target: formatted.filter(x => x.bucket === 'target').length,
          dream: formatted.filter(x => x.bucket === 'dream').length,
          title: "Gujarat state prediction",
        },
        data: balanced
      };

    } catch(e: any) {
      return { success: false, message: e.message };
    }
  }


  async predictUp(body: any) {
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

      const matchStage: any = { counsellingType: 'UP', rankNum: { $gte: minRank, $lte: maxRank } };

      if (body.round_no && body.round_no !== 'all' && body.round_no !== 'latest') matchStage['extraDetails.round_no'] = body.round_no;
      if (body.course_code) matchStage.courseNameRaw = body.course_code;
      if (body.allotted_category_base_code) matchStage['extraDetails.allotted_category_base_code'] = body.allotted_category_base_code;
      if (body.seat_reservation_type_code) matchStage.seatReservationTypeCode = body.seat_reservation_type_code;
      if (body.allotted_category_code) matchStage.allottedCategoryRaw = body.allotted_category_code;
      if (body.institute_code) matchStage.collegeCodeRaw = body.institute_code;

      const results = await this.prisma.allotment.aggregateRaw({
        pipeline: [
          { $match: matchStage },
          { $addFields: { rankDist: { $abs: { $subtract: ["$rankNum", inputRank] } } } },
          { $sort: { rankDist: 1 } },
          { 
            $group: {
              _id: "$collegeCodeRaw",
              instituteName: { $first: "$instituteNameRaw" },
              courseCode: { $first: "$courseNameRaw" },
              openingRank: { $min: "$rankNum" },
              closingRank: { $max: "$rankNum" },
              nearestRank: { $first: "$rankNum" },
              totalAllotments: { $sum: 1 },
              rounds: { $addToSet: "$extraDetails.round_no" },
              baseCategoryCodes: { $addToSet: "$extraDetails.allotted_category_base_code" },
              seatTypeCodes: { $addToSet: "$seatReservationTypeCode" },
              allottedCategoryCodes: { $addToSet: "$allottedCategoryRaw" },
              allottedCategoryDisplay: { $first: "$extraDetails.allotted_category_display" },
              similarCandidates: {
                $push: {
                  rank_num: "$rankNum",
                  round_no: "$extraDetails.round_no",
                  allotted_category_code: "$allottedCategoryRaw",
                  allotted_category_display: "$extraDetails.allotted_category_display",
                  allotted_category_base_code: "$extraDetails.allotted_category_base_code",
                  seat_reservation_type_code: "$seatReservationTypeCode",
                  institute_code: "$collegeCodeRaw",
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
        const name = row.instituteName || `College ${row._id}`;

        return {
          name: name,
          shortName: shortName(name),
          instituteCode: row._id,
          courseCode: row.courseCode,
          totalAllotments: row.totalAllotments,
          rounds: row.rounds.sort().join(", "),
          baseCategoryCodes: row.baseCategoryCodes.filter(Boolean).join(", "),
          seatTypeCodes: row.seatTypeCodes.filter(Boolean).join(", "),
          allottedCategoryCodes: row.allottedCategoryCodes.filter(Boolean).join(", "),
          allottedCategoryDisplay: row.allottedCategoryDisplay,
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
        mode: 'up',
        summary: {
          userRank: inputRank,
          totalCards: formatted.length,
          nearbyRange: nearbyRange,
          safe: formatted.filter(x => x.bucket === 'safe').length,
          target: formatted.filter(x => x.bucket === 'target').length,
          dream: formatted.filter(x => x.bucket === 'dream').length,
          title: "Uttar Pradesh state prediction",
        },
        data: balanced
      };

    } catch(e: any) {
      return { success: false, message: e.message };
    }
  }

}
