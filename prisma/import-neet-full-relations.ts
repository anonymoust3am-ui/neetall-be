import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import csv from "csv-parser";
import {
  PrismaClient,
  CounsellingLevel,
  CourseType,
  SeatOwnership,
} from "@prisma/client";

const prisma = new PrismaClient();

const CSV_FOLDER = process.argv[2];

if (!CSV_FOLDER) {
  console.error("Please provide CSV folder path.");
  console.error("Example: npx tsx scripts/import-neet-full-relations.ts ./data/csv");
  process.exit(1);
}

type CsvRow = Record<string, any>;

type CategoryInfo = {
  rawName: string | null;
  displayName: string | null;
  normalizedGroup: string | null;
  isPwd: boolean;
  isFemale: boolean;
  isNri: boolean;
  isMinority: boolean;
  isManagement: boolean;
  isDefence: boolean;
  isEws: boolean;
};

const cache = {
  state: new Map<string, any>(),
  counselling: new Map<string, any>(),
  institute: new Map<string, any>(),
  course: new Map<string, any>(),
  quota: new Map<string, any>(),
  categoryMap: new Map<string, any>(),
};

function cleanStr(value: any): string | null {
  if (value === undefined || value === null) return null;

  const s = String(value).trim();

  if (
    !s ||
    s === "-" ||
    s.toLowerCase() === "nan" ||
    s.toLowerCase() === "none" ||
    s.toLowerCase() === "null" ||
    s.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return s;
}

function toInt(value: any): number | null {
  const s = cleanStr(value);
  if (!s) return null;

  const cleaned = s.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;

  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(value: any): number | null {
  const s = cleanStr(value);
  if (!s) return null;

  const cleaned = s.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;

  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toBool(value: any): boolean {
  const s = cleanStr(value);
  if (!s) return false;
  return ["true", "1", "yes", "y"].includes(s.toLowerCase());
}

function slugify(value: any): string {
  const s = cleanStr(value) || "unknown";

  return (
    s
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 150) || "unknown"
  );
}

function normalizeRowKeys(row: CsvRow): CsvRow {
  const cleaned: CsvRow = {};

  for (const [key, value] of Object.entries(row)) {
    cleaned[String(key).trim()] = value;
  }

  return cleaned;
}

function listCsvFiles(folderPath: string): string[] {
  const files: string[] = [];

  for (const item of fs.readdirSync(folderPath)) {
    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listCsvFiles(fullPath));
    } else if (item.toLowerCase().endsWith(".csv")) {
      files.push(fullPath);
    }
  }

  return files;
}

function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: CsvRow) => rows.push(normalizeRowKeys(row)))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function inferCounsellingLevel(row: CsvRow, filePath: string): CounsellingLevel {
  const fileName = path.basename(filePath).toLowerCase();

  const sourceState = cleanStr(row.source_state) || "";
  const counsellingName =
    cleanStr(row.counselling_name) ||
    cleanStr(row.source_counselling_name) ||
    "";

  const text = `${fileName} ${sourceState} ${counsellingName}`.toLowerCase();

  if (text.includes("all india")) return CounsellingLevel.ALL_INDIA;
  if (text.includes("deemed")) return CounsellingLevel.DEEMED;
  if (text.includes("management")) return CounsellingLevel.PRIVATE_MANAGEMENT;

  if (
    text.includes("aiims") ||
    text.includes("jipmer") ||
    text.includes("bhu") ||
    text.includes("amu") ||
    text.includes("neigrihms")
  ) {
    return CounsellingLevel.CENTRAL;
  }

  if (sourceState && sourceState.toLowerCase() !== "all india") {
    return CounsellingLevel.STATE;
  }

  return CounsellingLevel.STATE;
}

function inferCourseType(courseName: any): CourseType {
  const text = (cleanStr(courseName) || "").toUpperCase();

  if (text.includes("MBBS")) return CourseType.MBBS;
  if (text.includes("BDS")) return CourseType.BDS;
  if (text.includes("BAMS")) return CourseType.BAMS;
  if (text.includes("BHMS")) return CourseType.BHMS;
  if (text.includes("BUMS")) return CourseType.BUMS;
  if (text.includes("BVSC")) return CourseType.BVSC;

  return CourseType.OTHER;
}

function inferOwnershipFromText(textInput: string): SeatOwnership {
  const text = textInput.toLowerCase();

  if (text.includes("aiims")) return SeatOwnership.AIIMS;
  if (text.includes("jipmer")) return SeatOwnership.JIPMER;
  if (text.includes("deemed")) return SeatOwnership.DEEMED;
  if (text.includes("nri")) return SeatOwnership.NRI;

  if (
    text.includes("management") ||
    text.includes("paid seats") ||
    text.includes("cat b") ||
    text.includes("mq")
  ) {
    return SeatOwnership.MANAGEMENT;
  }

  if (
    text.includes("minority") ||
    text.includes("muslim") ||
    text.includes("jain")
  ) {
    return SeatOwnership.MINORITY;
  }

  if (text.includes("esi") || text.includes("insured")) {
    return SeatOwnership.ESI;
  }

  if (text.includes("private")) return SeatOwnership.PRIVATE;

  if (text.includes("government") || text.includes("govt")) {
    return SeatOwnership.GOVERNMENT;
  }

  if (
    text.includes("central") ||
    text.includes("bhu") ||
    text.includes("amu") ||
    text.includes("delhi university") ||
    text.includes("ip university")
  ) {
    return SeatOwnership.CENTRAL_UNIVERSITY;
  }

  return SeatOwnership.OTHER;
}

function inferOwnership(row: CsvRow): SeatOwnership {
  return inferOwnershipFromText(`
    ${cleanStr(row.quota_name) || ""}
    ${cleanStr(row.master_quota) || ""}
    ${cleanStr(row.counselling_name) || ""}
    ${cleanStr(row.source_counselling_name) || ""}
    ${cleanStr(row.institute_name) || ""}
  `);
}

function normalizeQuota(row: CsvRow): string | null {
  const text = `
    ${cleanStr(row.quota_name) || ""}
    ${cleanStr(row.master_quota) || ""}
    ${cleanStr(row.quota_short_name) || ""}
  `.toUpperCase();

  if (!text.trim()) return null;

  if (text.includes("ALL INDIA") || /\bAIQ\b/.test(text)) return "AIQ";
  if (text.includes("STATE")) return "STATE";
  if (text.includes("MANAGEMENT") || text.includes("CAT B")) return "MANAGEMENT";
  if (text.includes("PAID")) return "PAID";
  if (text.includes("NRI")) return "NRI";
  if (text.includes("DEEMED")) return "DEEMED";
  if (text.includes("AIIMS")) return "AIIMS";
  if (text.includes("JIPMER")) return "JIPMER";
  if (text.includes("ESI") || text.includes("INSURED")) return "ESI";
  if (text.includes("AMU")) return "AMU";
  if (text.includes("BHU")) return "BHU";
  if (text.includes("DELHI")) return "DU";
  if (text.includes("IP")) return "IPU";

  const fallback =
    cleanStr(row.quota_short_name) ||
    cleanStr(row.quota_name) ||
    cleanStr(row.master_quota);

  return slugify(fallback).toUpperCase().replace(/-/g, "_");
}

function normalizeCategory(rawValue: any): CategoryInfo {
  const raw = cleanStr(rawValue);

  if (!raw) {
    return {
      rawName: null,
      displayName: null,
      normalizedGroup: null,
      isPwd: false,
      isFemale: false,
      isNri: false,
      isMinority: false,
      isManagement: false,
      isDefence: false,
      isEws: false,
    };
  }

  const t = raw.toUpperCase().replace(/\s+/g, " ").trim();

  const isPwd = /(PWD|PH|HANDICAP|DISABILITY)/.test(t);
  const isFemale = /(\bF\b|FEMALE|WOMEN|WOMAN|GIRL)/.test(t);
  const isNri = /NRI/.test(t);
  const isMinority = /(MINORITY|MUSLIM|JAIN|SIKH|CHRISTIAN)/.test(t);
  const isManagement = /(MQ|MANAGEMENT|MGMT|CAT B|CATEGORY B|PAID)/.test(t);
  const isDefence = /(DEFENCE|DEFENSE|EX.?SERVICEMAN|ESM|CW|ARMY|MILITARY)/.test(t);
  const isEws = /(EWS|EW)/.test(t);

  let normalizedGroup = "OTHER";
  let displayName = raw;

  if (isNri) {
    normalizedGroup = "NRI";
    displayName = "NRI";
  } else if (isManagement) {
    normalizedGroup = "MANAGEMENT";
    displayName = "Management";
  } else if (/(SC)/.test(t) && !/(SEBC)/.test(t)) {
    normalizedGroup = "SC";
    displayName = "SC";
  } else if (/(ST)/.test(t)) {
    normalizedGroup = "ST";
    displayName = "ST";
  } else if (/(EWS|EW)/.test(t)) {
    normalizedGroup = "EWS";
    displayName = "EWS";
  } else if (/(OBC|BC|MBC|SEBC|BCA|BCB|BACKWARD|2A|2B|3A|3B|CAT-?1|CAT 1|CAT I)/.test(t)) {
    normalizedGroup = "OBC";
    displayName = "OBC/BC";
  } else if (/(OPEN|OP|UR|GEN|GENERAL|GM|GMP|OC|UNRESERVED)/.test(t)) {
    normalizedGroup = "OPEN";
    displayName = "Open";
  }

  if (isPwd && displayName) {
    displayName = `${displayName}-PwD`;
  }

  return {
    rawName: raw,
    displayName,
    normalizedGroup,
    isPwd,
    isFemale,
    isNri,
    isMinority,
    isManagement,
    isDefence,
    isEws,
  };
}

function inferInstituteState(row: CsvRow, filePath: string): string | null {
  const state = cleanStr(row.state);
  if (state) return state;

  const sourceState = cleanStr(row.source_state);
  if (sourceState && sourceState.toLowerCase() !== "all india") {
    return sourceState;
  }

  const base = path.basename(filePath, ".csv").replace(/^\d+_/, "");

  return (
    base
      .replace(/_zynerd.*$/i, "")
      .replace(/_ug_medical.*$/i, "")
      .replace(/_govt_management_2025$/i, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase()) || null
  );
}

function buildSourceKey(row: CsvRow, filePath: string): string {
  const session = cleanStr(row.session) || "unknown-year";

  const counsellingId =
    cleanStr(row.counselling_id) ||
    cleanStr(row.source_counselling_id) ||
    "unknown-counselling";

  const roundNo = cleanStr(row.round_no) || "unknown-round";

  const allotmentId = cleanStr(row.zynerd_allotment_id);

  if (allotmentId) {
    return `${session}_${counsellingId}_${roundNo}_${allotmentId}`;
  }

  const stableText = JSON.stringify({
    file: path.basename(filePath),
    session,
    counsellingId,
    roundNo,
    rank: cleanStr(row.rank),
    institute: cleanStr(row.institute_name),
    course: cleanStr(row.course_name),
    quota: cleanStr(row.quota_name),
    category: cleanStr(row.category),
  });

  return crypto.createHash("sha1").update(stableText).digest("hex");
}

/* -------------------------------------------------------------------------- */
/*                               GET OR CREATE                                */
/* -------------------------------------------------------------------------- */

async function getOrCreateState(nameInput: any) {
  const name = cleanStr(nameInput);
  if (!name) return null;

  const slug = slugify(name);
  const cacheKey = slug;

  if (cache.state.has(cacheKey)) return cache.state.get(cacheKey);

  let state = await prisma.state.findFirst({
    where: { slug },
  });

  if (!state) {
    state = await prisma.state.create({
      data: {
        name,
        slug,
        code: null,
      },
    });
  }

  cache.state.set(cacheKey, state);
  return state;
}

async function getOrCreateCounselling(row: CsvRow, filePath: string, level: CounsellingLevel, counsellingState: any) {
  const year = toInt(row.session) || 2025;

  const sourceCounsellingId =
    cleanStr(row.counselling_id) ||
    cleanStr(row.source_counselling_id) ||
    slugify(path.basename(filePath, ".csv"));

  const name =
    cleanStr(row.counselling_name) ||
    cleanStr(row.source_counselling_name) ||
    path.basename(filePath, ".csv").replace(/_/g, " ");

  const cacheKey = `${sourceCounsellingId}::${year}`;

  if (cache.counselling.has(cacheKey)) return cache.counselling.get(cacheKey);

  let counselling = await prisma.counselling.findFirst({
    where: {
      sourceCounsellingId,
      year,
    },
  });

  if (!counselling) {
    counselling = await prisma.counselling.create({
      data: {
        sourceCounsellingId,
        name,
        slug: `${slugify(name)}-${year}`,
        level,
        stateId: counsellingState?.id || null,
        sourceStateName: cleanStr(row.source_state),
        year,
        isActive: true,
      },
    });
  }

  cache.counselling.set(cacheKey, counselling);
  return counselling;
}

async function getOrCreateInstitute(row: CsvRow, instituteState: any) {
  const name = cleanStr(row.institute_name);
  if (!name) return null;

  const sourceInstituteId = cleanStr(row.institute_id);
  const cacheKey = sourceInstituteId
    ? `source:${sourceInstituteId}`
    : `name:${slugify(name)}:${instituteState?.id || "no-state"}`;

  if (cache.institute.has(cacheKey)) return cache.institute.get(cacheKey);

  let institute: any = null;

  if (sourceInstituteId) {
    institute = await prisma.institute.findFirst({
      where: { sourceInstituteId },
    });
  }

  if (!institute) {
    institute = await prisma.institute.findFirst({
      where: {
        name,
        stateId: instituteState?.id || undefined,
      },
    });
  }

  cache.institute.set(cacheKey, institute);
  return institute;
}

async function getOrCreateCourse(row: CsvRow) {
  const name = cleanStr(row.course_name);
  if (!name) return null;

  const sourceCourseId = cleanStr(row.course_id);
  const type = inferCourseType(name);

  const cacheKey = sourceCourseId ? `source:${sourceCourseId}` : `name:${slugify(name)}`;

  if (cache.course.has(cacheKey)) return cache.course.get(cacheKey);

  let course: any = null;

  if (sourceCourseId) {
    course = await prisma.course.findFirst({
      where: { sourceCourseId },
    });
  }

  if (!course) {
    course = await prisma.course.findFirst({
      where: { slug: sourceCourseId ? `${slugify(name)}-${sourceCourseId}` : slugify(name) },
    });
  }

  if (!course) {
    course = await prisma.course.create({
      data: {
        sourceCourseId,
        name,
        shortName: cleanStr(row.course_short_name),
        slug: sourceCourseId ? `${slugify(name)}-${sourceCourseId}` : slugify(name),
        type,
        isActive: true,
      },
    });
  }

  cache.course.set(cacheKey, course);
  return course;
}

async function getOrCreateQuota(row: CsvRow, counselling: any) {
  const sourceQuotaId = cleanStr(row.quota_id);
  const name = cleanStr(row.quota_name) || cleanStr(row.master_quota) || "Unknown Quota";
  const shortName = cleanStr(row.quota_short_name);
  const masterQuota = cleanStr(row.master_quota);
  const normalizedCode = normalizeQuota(row);
  const ownership = inferOwnership(row);

  const cacheKey = `${sourceQuotaId || slugify(name)}::${counselling?.id || "no-counselling"}`;

  if (cache.quota.has(cacheKey)) return cache.quota.get(cacheKey);

  let quota: any = null;

  if (sourceQuotaId) {
    quota = await prisma.quota.findFirst({
      where: {
        sourceQuotaId,
        counsellingId: counselling?.id || null,
      },
    });
  }

  if (!quota) {
    quota = await prisma.quota.findFirst({
      where: {
        name,
        counsellingId: counselling?.id || null,
      },
    });
  }

  if (!quota) {
    quota = await prisma.quota.create({
      data: {
        sourceQuotaId,
        name,
        shortName,
        masterQuota,
        normalizedCode,
        ownership,
        counsellingId: counselling?.id || null,
      },
    });
  }

  cache.quota.set(cacheKey, quota);
  return quota;
}

async function getOrCreateCategoryMap(row: CsvRow, counselling: any) {
  const info = normalizeCategory(row.category);

  if (!info.rawName) return null;

  const cacheKey = `${info.rawName}::${counselling?.id || "no-counselling"}`;

  if (cache.categoryMap.has(cacheKey)) return cache.categoryMap.get(cacheKey);

  let categoryMap = await prisma.categoryMap.findFirst({
    where: {
      rawName: info.rawName,
      counsellingId: counselling?.id || null,
    },
  });

  if (!categoryMap) {
    categoryMap = await prisma.categoryMap.create({
      data: {
        rawName: info.rawName,
        displayName: info.displayName || info.rawName,
        normalizedGroup: info.normalizedGroup || "OTHER",
        isPwd: info.isPwd,
        isFemale: info.isFemale,
        isNri: info.isNri,
        isMinority: info.isMinority,
        isManagement: info.isManagement,
        isDefence: info.isDefence,
        isEws: info.isEws,
        counsellingId: counselling?.id || null,
      },
    });
  }

  cache.categoryMap.set(cacheKey, categoryMap);
  return categoryMap;
}

/* -------------------------------------------------------------------------- */
/*                            ALLOTMENT INSERTION                             */
/* -------------------------------------------------------------------------- */

async function buildAllotmentRecordData(row: CsvRow, filePath: string) {
  const sourceKey = buildSourceKey(row, filePath);

  const counsellingLevel = inferCounsellingLevel(row, filePath);

  const counsellingStateName =
    counsellingLevel === CounsellingLevel.ALL_INDIA
      ? null
      : cleanStr(row.source_state) || inferInstituteState(row, filePath);

  const counsellingState = counsellingStateName
    ? await getOrCreateState(counsellingStateName)
    : null;

  const instituteStateName = inferInstituteState(row, filePath);
  const instituteState = instituteStateName
    ? await getOrCreateState(instituteStateName)
    : null;

  const counselling = await getOrCreateCounselling(row, filePath, counsellingLevel, counsellingState);
  const institute = await getOrCreateInstitute(row, instituteState);
  const course = await getOrCreateCourse(row);
  const quota = await getOrCreateQuota(row, counselling);
  const categoryMap = await getOrCreateCategoryMap(row, counselling);

  const categoryInfo = normalizeCategory(row.category);

  const courseName = cleanStr(row.course_name) || "UNKNOWN";
  const instituteName = cleanStr(row.institute_name) || "UNKNOWN";

  return {
    sourceKey,

    zynerdAllotmentId: cleanStr(row.zynerd_allotment_id),
    sourceCounsellingId:
      cleanStr(row.source_counselling_id) || cleanStr(row.counselling_id),
    sourceInstituteId: cleanStr(row.institute_id),
    sourceCourseId: cleanStr(row.course_id),
    sourceQuotaId: cleanStr(row.quota_id),
    sourceFeeId: cleanStr(row.fee_id),

    sessionYear: toInt(row.session) || 2025,
    counsellingLevel,

    counsellingId: counselling?.id || null,

    sourceStateName: cleanStr(row.source_state),
    sourceCounsellingName: cleanStr(row.source_counselling_name),
    counsellingName: cleanStr(row.counselling_name),

    roundRaw: cleanStr(row.round_no),
    roundNo: toFloat(row.round_no),

    rankRaw: cleanStr(row.rank),
    rank: toInt(row.rank),

    aiRankRaw: cleanStr(row.ai_rank),
    aiRank: toInt(row.ai_rank),

    counsellingRankRaw: cleanStr(row.counselling_rank),
    counsellingRank: toInt(row.counselling_rank),

    instituteId: institute?.id || null,

    instituteStateSnapshot: instituteStateName,
    instituteStateSlugSnapshot: instituteStateName ? slugify(instituteStateName) : null,
    instituteNameSnapshot: instituteName,
    instituteShortNameSnapshot: cleanStr(row.institute_short_name),
    instituteDistrictSnapshot: cleanStr(row.institute_district),

    courseId: course?.id || null,

    courseNameSnapshot: courseName,
    courseShortNameSnapshot: cleanStr(row.course_short_name),
    courseTypeSnapshot: inferCourseType(courseName),

    quotaIdRef: quota?.id || null,

    quotaNameSnapshot: cleanStr(row.quota_name),
    quotaShortNameSnapshot: cleanStr(row.quota_short_name),
    masterQuotaSnapshot: cleanStr(row.master_quota),
    quotaNormalizedSnapshot: normalizeQuota(row),
    ownershipSnapshot: inferOwnership(row),

    categoryMapId: categoryMap?.id || null,

    categoryRaw: cleanStr(row.category),
    categoryDisplay: categoryInfo.displayName,
    categoryNormalized: categoryInfo.normalizedGroup,

    isPwd: categoryInfo.isPwd,
    isFemale: categoryInfo.isFemale,
    isNri: categoryInfo.isNri,
    isMinority: categoryInfo.isMinority,
    isManagement: categoryInfo.isManagement,

    feeRaw: cleanStr(row.fee),
    feeAmount: toInt(row.fee),

    bedsRaw: cleanStr(row.beds),
    bedsCount: toInt(row.beds),

    bondYearsRaw: cleanStr(row.bond_years),
    bondYearsNumber: toFloat(row.bond_years),

    bondPenaltyRaw: cleanStr(row.bond_penalty),
    bondPenaltyAmount: toInt(row.bond_penalty),

    stipendYear1Raw: cleanStr(row.stipend_year_1),
    stipendYear1Amount: toInt(row.stipend_year_1),

    inserviceCandidate: toBool(row.inservice_candidate),
    candidateFlag: cleanStr(row.candidate_flag),
    choiceListCount: toInt(row.choice_list_count),

    // Not creating ImportBatch because your current pasted schema only has importBatchId,
    // not a full ImportBatch relation model.
    importBatchId: null,

    rawRow: {
      ...row,
      importedFromFile: path.basename(filePath),
      importedFilePath: filePath,
      importNote:
        "Inserted with references: State, Counselling, Institute, Course, Quota, CategoryMap, and AllotmentRecord.",
    },
  };
}

async function insertAllotmentRecord(row: CsvRow, filePath: string) {
  const data = await buildAllotmentRecordData(row, filePath);

  const existing = await prisma.allotmentRecord.findUnique({
    where: {
      sourceKey: data.sourceKey,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return "skipped";
  }

  await prisma.allotmentRecord.create({
    data,
  });

  return "inserted";
}

async function importFile(filePath: string) {
  const fileName = path.basename(filePath);
  console.log(`\n[START] ${fileName}`);

  const rows = await readCsv(filePath);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      const result = await insertAllotmentRecord(rows[i], filePath);

      if (result === "inserted") inserted += 1;
      else skipped += 1;
    } catch (error: any) {
      failed += 1;
      console.error(`[FAILED] ${fileName} row=${i + 1}: ${error.message}`);
    }

    if ((i + 1) % 1000 === 0) {
      console.log(
        `[PROGRESS] ${fileName}: processed=${i + 1}/${rows.length}, inserted=${inserted}, skipped=${skipped}, failed=${failed}`
      );
    }
  }

  console.log(
    `[DONE] ${fileName}: total=${rows.length}, inserted=${inserted}, skipped=${skipped}, failed=${failed}`
  );

  return {
    total: rows.length,
    inserted,
    skipped,
    failed,
  };
}

async function main() {
  const absoluteFolder = path.resolve(CSV_FOLDER as string);

  if (!fs.existsSync(absoluteFolder)) {
    throw new Error(`CSV folder not found: ${absoluteFolder}`);
  }

  const csvFiles = listCsvFiles(absoluteFolder);

  if (csvFiles.length === 0) {
    console.log("No CSV files found.");
    return;
  }

  console.log(`Found ${csvFiles.length} CSV files.`);

  // const timedDrop = async (
  //   label: string,
  //   collectionName: string
  // ) => {
  //   console.log(`[START DROP] ${label}`);

  //   const start = Date.now();

  //   try {
  //     // drop collection directly
  //     await prisma.$runCommandRaw({
  //       drop: collectionName,
  //     });

  //     const end = Date.now();

  //     console.log(
  //       `[DONE DROP] ${label} -> dropped in ${(
  //         (end - start) /
  //         1000
  //       ).toFixed(2)}s`
  //     );
  //   } catch (err: any) {
  //     // ignore "namespace not found"
  //     if (
  //       err?.message?.includes("ns not found") ||
  //       err?.message?.includes("NamespaceNotFound")
  //     ) {
  //       console.log(`[SKIP] ${label} collection does not exist`);
  //       return;
  //     }

  //     console.error(`[ERROR DROP] ${label}`);
  //     console.error(err);

  //     throw err;
  //   }
  // };

  // console.log("\nStarting database cleanup using DROP...\n");

  // await timedDrop("AllotmentRecords", "AllotmentRecord");

  // await timedDrop("CategoryMaps", "CategoryMap");

  // await timedDrop("Quotas", "Quota");

  // await timedDrop("Courses", "Course");

  // await timedDrop("Institutes", "Institute");

  // await timedDrop("Counsellings", "Counselling");

  // await timedDrop("States", "State");

  // console.log("\nDatabase cleanup completed.\n");

  let total = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of csvFiles) {
    const result = await importFile(filePath);

    total += result.total;
    inserted += result.inserted;
    skipped += result.skipped;
    failed += result.failed;
  }

  console.log("\n================ FINAL IMPORT SUMMARY ================");
  console.log(`Total rows read:      ${total}`);
  console.log(`Inserted rows:        ${inserted}`);
  console.log(`Skipped duplicates:   ${skipped}`);
  console.log(`Failed rows:          ${failed}`);
  console.log("======================================================");
}

main()
  .catch((error) => {
    console.error("\nIMPORT FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
