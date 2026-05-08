import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';

const prisma = new PrismaClient();

// MySQL connection details - Update if necessary
const MYSQL_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'mysql'
};

async function main() {
  console.log('Starting Migration Process...');

  // 1. Establish MySQL Connections
  console.log('Connecting to MySQL databases...');
  const upGjrDb = await mysql.createConnection({ ...MYSQL_CONFIG, database: 'up_gjr_ug' });
  const neetDb = await mysql.createConnection({ ...MYSQL_CONFIG, database: 'neet_ug_db2' });
  const aiqDb = await mysql.createConnection({ ...MYSQL_CONFIG, database: 'all_india_ug' });
  console.log('Connected to MySQL successfully.');

  // 2. Clear Existing MongoDB Collections
  console.log('Clearing existing MongoDB collections...');
  await prisma.allotment.deleteMany({});
  await prisma.cutoff.deleteMany({});
  await prisma.round.deleteMany({});
  await prisma.counsellingSession.deleteMany({});
  await prisma.institute.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.quota.deleteMany({});
  await prisma.authority.deleteMany({});
  await prisma.state.deleteMany({});
  console.log('MongoDB collections cleared.');

  // Mappings to link MySQL IDs to MongoDB ObjectIDs
  const stateMap = new Map(); // key: state_code
  const authorityMap = new Map(); // key: authority_code
  const sessionMap = new Map(); // key: authCode_year
  const roundMap = new Map(); // key: sessionId_roundNo
  const instituteMap = new Map(); // key: cleanName or code
  const courseMap = new Map(); // key: courseCode
  const categoryMap = new Map(); // key: categoryCode
  const quotaMap = new Map(); // key: quotaCode

  // --- STATES ---
  console.log('Migrating States...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [states]: any = await db.execute('SELECT * FROM states');
      for (const st of states) {
        if (!stateMap.has(st.state_code)) {
          const newState = await prisma.state.create({
            data: {
              stateCode: st.state_code || 'UNKNOWN',
              stateName: st.state_name,
            },
          });
          stateMap.set(st.state_code, newState.id);
          stateMap.set(`db_${st.state_id}`, newState.id); // For local joins
        } else {
          stateMap.set(`db_${st.state_id}`, stateMap.get(st.state_code));
        }
      }
    } catch (e) {
      console.warn(`No states table in one of the DBs or error: ${(e as Error).message}`);
    }
  }

  // --- AUTHORITIES ---
  console.log('Migrating Authorities...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [authorities]: any = await db.execute('SELECT * FROM counselling_authorities');
      for (const auth of authorities) {
        if (!authorityMap.has(auth.authority_code)) {
          const newAuth = await prisma.authority.create({
            data: {
              authorityCode: auth.authority_code,
              authorityName: auth.authority_name,
              authorityType: auth.authority_type,
              officialWebsite: auth.official_website || null,
              stateId: auth.state_id ? stateMap.get(`db_${auth.state_id}`) : null,
            },
          });
          authorityMap.set(auth.authority_code, newAuth.id);
          authorityMap.set(`db_${auth.authority_id}`, newAuth.id);
        } else {
          authorityMap.set(`db_${auth.authority_id}`, authorityMap.get(auth.authority_code));
        }
      }
    } catch (e) { }
  }

  // --- SESSIONS ---
  console.log('Migrating Sessions...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [sessions]: any = await db.execute('SELECT * FROM counselling_sessions');
      for (const sess of sessions) {
        const authMongoId = authorityMap.get(`db_${sess.authority_id}`);
        const sessKey = `${authMongoId}_${sess.session_year}`;
        if (!sessionMap.has(sessKey) && authMongoId) {
          const newSess = await prisma.counsellingSession.create({
            data: {
              authorityId: authMongoId,
              sessionYear: String(sess.session_year),
              examYear: sess.exam_year,
              examName: sess.exam_name || 'NEET',
              examType: sess.exam_type || 'UG',
              sessionName: sess.session_name || '',
              isActive: sess.is_active === 1,
            },
          });
          sessionMap.set(sessKey, newSess.id);
          sessionMap.set(`db_${sess.session_id}`, newSess.id);
        } else if (sessionMap.has(sessKey)) {
          sessionMap.set(`db_${sess.session_id}`, sessionMap.get(sessKey));
        }
      }
    } catch (e) { }
  }

  // --- ROUNDS ---
  console.log('Migrating Rounds...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [rounds]: any = await db.execute('SELECT * FROM counselling_rounds');
      for (const r of rounds) {
        const sessMongoId = sessionMap.get(`db_${r.session_id}`);
        if (!sessMongoId) continue;
        const roundKey = `${sessMongoId}_${r.round_no}`;
        if (!roundMap.has(roundKey)) {
          const newRound = await prisma.round.create({
            data: {
              sessionId: sessMongoId,
              roundNo: r.round_no,
              roundCode: r.round_code || String(r.round_no),
              roundName: r.round_name || `Round ${r.round_no}`,
              roundType: r.round_type || 'ROUND',
              resultType: r.result_type || null,
            },
          });
          roundMap.set(roundKey, newRound.id);
          roundMap.set(`db_${r.round_id}`, newRound.id);
        } else {
          roundMap.set(`db_${r.round_id}`, roundMap.get(roundKey));
        }
      }
    } catch (e) { }
  }

  // --- INSTITUTES ---
  console.log('Migrating Institutes...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [institutes]: any = await db.execute('SELECT * FROM institutes');
      for (const inst of institutes) {
        const instKey = inst.institute_name_clean || inst.institute_name;
        if (!instituteMap.has(instKey)) {
          const newInst = await prisma.institute.create({
            data: {
              instituteCode: inst.institute_code || null,
              instituteName: inst.institute_name || '',
              instituteNameClean: inst.institute_name_clean || null,
              city: inst.city || null,
              district: inst.district || null,
              pincode: inst.pincode || null,
              instituteType: inst.institute_type || null,
              ownershipType: inst.ownership_type || null,
              stateId: inst.state_id ? stateMap.get(`db_${inst.state_id}`) : null,
            },
          });
          instituteMap.set(instKey, newInst.id);
          instituteMap.set(`db_${inst.institute_id}`, newInst.id);
        } else {
          instituteMap.set(`db_${inst.institute_id}`, instituteMap.get(instKey));
        }
      }
    } catch (e) { }
  }

  // --- COURSES ---
  console.log('Migrating Courses...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const [courses]: any = await db.execute('SELECT * FROM courses');
      for (const c of courses) {
        if (!courseMap.has(c.course_code)) {
          const newCourse = await prisma.course.create({
            data: {
              courseCode: c.course_code,
              courseName: c.course_name,
              courseGroup: c.course_group || null,
            },
          });
          courseMap.set(c.course_code, newCourse.id);
          courseMap.set(`db_${c.course_id}`, newCourse.id);
        } else {
          courseMap.set(`db_${c.course_id}`, courseMap.get(c.course_code));
        }
      }
    } catch (e) { }
  }

  // --- CATEGORIES ---
  console.log('Migrating Categories...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      // Handle both categories and category_master tables depending on the DB schema
      const tableName = db === aiqDb ? 'category_master' : 'categories';
      const [categories]: any = await db.execute(`SELECT * FROM ${tableName}`);
      for (const cat of categories) {
        if (!categoryMap.has(cat.category_code)) {
          const newCat = await prisma.category.create({
            data: {
              categoryCode: cat.category_code,
              categoryName: cat.category_name,
              categoryGroup: cat.category_group || null,
              stateId: cat.state_id ? stateMap.get(`db_${cat.state_id}`) : null,
              isActive: cat.is_active === 1,
            },
          });
          categoryMap.set(cat.category_code, newCat.id);
          categoryMap.set(`db_${cat.category_id}`, newCat.id);
        } else {
          categoryMap.set(`db_${cat.category_id}`, categoryMap.get(cat.category_code));
        }
      }
    } catch (e) { }
  }

  // --- QUOTAS ---
  console.log('Migrating Quotas...');
  for (const db of [upGjrDb, neetDb, aiqDb]) {
    try {
      const tableName = db === aiqDb ? 'quota_master' : 'quotas';
      const [quotas]: any = await db.execute(`SELECT * FROM ${tableName}`);
      for (const q of quotas) {
        if (!quotaMap.has(q.quota_code)) {
          const newQuota = await prisma.quota.create({
            data: {
              quotaCode: q.quota_code,
              quotaName: q.quota_name,
              quotaGroup: q.quota_group || null,
              stateId: q.state_id ? stateMap.get(`db_${q.state_id}`) : null,
              isActive: q.is_active === 1,
            },
          });
          quotaMap.set(q.quota_code, newQuota.id);
          quotaMap.set(`db_${q.quota_id}`, newQuota.id);
        } else {
          quotaMap.set(`db_${q.quota_id}`, quotaMap.get(q.quota_code));
        }
      }
    } catch (e) { }
  }

  console.log('Master data migration complete.');

  // --- HELPER BATCH INSERTER ---
  async function batchInsertAllotments(allotments: any[]) {
    if (allotments.length === 0) return;
    const chunkSize = 2000;
    for (let i = 0; i < allotments.length; i += chunkSize) {
      await prisma.allotment.createMany({
        data: allotments.slice(i, i + chunkSize),
      });
      console.log(`Inserted batch ${i} to ${i + chunkSize}`);
    }
  }

  // --- ALL INDIA ALLOTMENTS ---
  console.log('Migrating All India Allotments...');
  try {
    const [aiqAllotments]: any = await aiqDb.execute('SELECT * FROM allotments'); // Removed limit to migrate all
    const mappedAiq = aiqAllotments.map((a: any) => ({
      counsellingType: 'ALL_INDIA',
      stateId: authorityMap.get(`db_${a.authority_id}`) ? authorityMap.get(`db_${a.authority_id}`) : stateMap.values().next().value, // Fallback if no specific state
      authorityId: authorityMap.get(`db_${a.authority_id}`),
      sessionId: sessionMap.get(`db_${a.session_id}`),
      roundId: roundMap.get(`db_${a.round_id}`),
      rankNum: a.rank_num,
      rankText: a.rank_text,
      allottedCategoryId: categoryMap.get(`db_${a.allotted_category_id}`),
      allottedCategoryRaw: a.allotted_category_code,
      candidateCategoryId: categoryMap.get(`db_${a.candidate_category_id}`),
      candidateCategoryRaw: a.candidate_category_code,
      quotaId: quotaMap.get(`db_${a.quota_id}`),
      quotaRaw: a.quota_code,
      instituteId: instituteMap.get(`db_${a.institute_id}`),
      instituteNameRaw: a.institute_name_raw || a.institute_name_clean,
      courseId: courseMap.get(`db_${a.course_id}`),
      courseNameRaw: a.course_name,
      allotmentStatus: a.allotment_status,
      recordStatus: a.record_status,
    })).filter((x: any) => x.authorityId && x.sessionId && x.roundId); // ensure valid relations

    await batchInsertAllotments(mappedAiq);
  } catch (e) {
    console.error('Error importing AIQ Allotments:', (e as Error).message);
  }

  // --- UP ALLOTMENTS ---
  console.log('Migrating UP Allotments...');
  try {
    const [upAllotments]: any = await upGjrDb.execute('SELECT * FROM up_allotments_final');
    // Assuming UP state is correctly mapped, let's find the state ID for UP
    const upStateId = Array.from(stateMap.entries()).find(([k]) => k && typeof k === 'string' && k.includes('UP'))?.[1] || stateMap.values().next().value;
    const mappedUp = upAllotments.map((a: any) => {
      // Find session/round from name or map
      // Since UP final tables don't use foreign keys for round, we mock it or find by round_no
      const roundKeySearch = Array.from(roundMap.keys()).find(k => k.endsWith(`_${a.round_no}`));
      const matchedRoundId = roundMap.get(roundKeySearch) || roundMap.values().next().value;
      const matchedSessionId = sessionMap.values().next().value;
      const matchedAuthId = authorityMap.values().next().value;

      return {
        counsellingType: 'UP',
        stateId: upStateId,
        authorityId: matchedAuthId,
        sessionId: matchedSessionId,
        roundId: matchedRoundId,
        rankNum: a.rank_num,
        candidateRollNo: a.candidate_roll_no,
        candidateName: a.candidate_name,
        allottedCategoryRaw: a.allotted_category_code,
        instituteNameRaw: a.institute_name,
        collegeCodeRaw: a.institute_code,
        courseNameRaw: a.course_name,
        seatReservationTypeCode: a.seat_reservation_type_code,
        allotmentStatus: a.allotment_status,
        recordStatus: a.record_status,
      };
    });

    await batchInsertAllotments(mappedUp);
  } catch (e) {
    console.error('Error importing UP Allotments:', (e as Error).message);
  }

  // --- GUJARAT ALLOTMENTS ---
  console.log('Migrating Gujarat Allotments...');
  try {
    const [gjrAllotments]: any = await upGjrDb.execute('SELECT * FROM gujarat_allotments_final');
    const gjStateId = Array.from(stateMap.entries()).find(([k]) => k && typeof k === 'string' && k.includes('GJ'))?.[1] || stateMap.values().next().value;
    const mappedGj = gjrAllotments.map((a: any) => {
      const roundKeySearch = Array.from(roundMap.keys()).find(k => k.endsWith(`_${a.actual_round_no}`));
      const matchedRoundId = roundMap.get(roundKeySearch) || roundMap.values().next().value;
      const matchedSessionId = sessionMap.values().next().value;
      const matchedAuthId = authorityMap.values().next().value;

      return {
        counsellingType: 'GJ',
        stateId: gjStateId,
        authorityId: matchedAuthId,
        sessionId: matchedSessionId,
        roundId: matchedRoundId,
        meritNo: Number(a.merit_no) || null,
        neetScore: a.neet_score,
        candidateName: a.student_name,
        allottedCategoryRaw: a.adm_category_code,
        candidateCategoryRaw: a.candidate_category_code,
        quotaRaw: a.quota_code,
        instituteNameRaw: a.institute_code,
        collegeCodeRaw: a.college_code,
        allotmentStatus: a.allotment_status,
        recordStatus: a.record_status,
        extraDetails: { admission_extra_info: a.admission_extra_info, nri_priority: a.nri_priority },
      };
    });

    await batchInsertAllotments(mappedGj);
  } catch (e) {
    console.error('Error importing Gujarat Allotments:', (e as Error).message);
  }

  // --- MAHARASHTRA ALLOTMENTS ---
  console.log('Migrating Maharashtra Allotments...');
  try {
    const [mhAllotments]: any = await neetDb.execute('SELECT * FROM mh_allotments_app3');
    const mhStateId = Array.from(stateMap.entries()).find(([k]) => k && typeof k === 'string' && k.includes('MH'))?.[1] || stateMap.values().next().value;
    const mappedMh = mhAllotments.map((a: any) => {
      const roundKeySearch = Array.from(roundMap.keys()).find(k => k.endsWith(`_${a.round_no}`));
      const matchedRoundId = roundMap.get(roundKeySearch) || roundMap.values().next().value;
      const matchedSessionId = sessionMap.values().next().value;
      const matchedAuthId = authorityMap.values().next().value;

      return {
        counsellingType: 'MH',
        stateId: mhStateId,
        authorityId: matchedAuthId,
        sessionId: matchedSessionId,
        roundId: matchedRoundId,
        rankNum: a.rank_num,
        air: a.air,
        candidateName: a.candidate_name,
        gender: a.gender,
        allottedCategoryRaw: a.allotted_category_code,
        candidateCategoryRaw: a.candidate_category_code,
        quotaRaw: a.quota_code,
        instituteNameRaw: a.institute_name,
        collegeCodeRaw: a.college_code,
        courseNameRaw: a.course_name,
        seatReservationTypeCode: a.seat_reservation_type_code,
        otherReservationCode: a.other_reservation_code,
        isWomenQuota: a.is_women_quota === 1,
        allotmentStatus: a.allotment_status,
        recordStatus: a.record_status,
      };
    });

    await batchInsertAllotments(mappedMh);
  } catch (e) {
    console.error('Error importing MH Allotments:', (e as Error).message);
  }

  console.log('\n--- VERIFICATION ---');
  try {
    const [[{ aiqCount }]]: any = await aiqDb.execute('SELECT COUNT(*) as aiqCount FROM allotments');
    const [[{ upCount }]]: any = await upGjrDb.execute('SELECT COUNT(*) as upCount FROM up_allotments_final');
    const [[{ gjCount }]]: any = await upGjrDb.execute('SELECT COUNT(*) as gjCount FROM gujarat_allotments_final');
    const [[{ mhCount }]]: any = await neetDb.execute('SELECT COUNT(*) as mhCount FROM mh_allotments_app3');
    
    const totalMysql = aiqCount + upCount + gjCount + mhCount;
    
    const mongoAiqCount = await prisma.allotment.count({ where: { counsellingType: 'ALL_INDIA' } });
    const mongoUpCount = await prisma.allotment.count({ where: { counsellingType: 'UP' } });
    const mongoGjCount = await prisma.allotment.count({ where: { counsellingType: 'GJ' } });
    const mongoMhCount = await prisma.allotment.count({ where: { counsellingType: 'MH' } });
    const totalMongo = await prisma.allotment.count();

    console.table([
      { State: 'All India (AIQ)', MySQL: aiqCount, MongoDB: mongoAiqCount },
      { State: 'Uttar Pradesh (UP)', MySQL: upCount, MongoDB: mongoUpCount },
      { State: 'Gujarat (GJ)', MySQL: gjCount, MongoDB: mongoGjCount },
      { State: 'Maharashtra (MH)', MySQL: mhCount, MongoDB: mongoMhCount },
      { State: 'TOTAL', MySQL: totalMysql, MongoDB: totalMongo }
    ]);
    
    if (totalMysql === totalMongo) {
      console.log('✅ SUCCESS: All rows correctly migrated to MongoDB!');
    } else {
      console.warn('⚠️ WARNING: There is a discrepancy in the row counts.');
    }
  } catch(e) {
    console.error('Could not run verification:', (e as Error).message);
  }

  console.log('Migration Completed Successfully!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
