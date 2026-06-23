import { GeminiService } from '../gemini/gemini.service';
import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PredictorService } from '../predictor/predictor.service';
import { PrismaService } from '../../prisma/prisma.service';

type ChatIntent =
  | 'prediction'
  | 'general_counselling'
  | 'exam_date'
  | 'college_info';

type CounsellingScope = 'ALL_INDIA' | 'STATE' | undefined;

type ExtractedCounsellingInput = {
  rank?: number;
  category?: string;
  state?: string;
  course?: string;
  quota?: string;
  scope: CounsellingScope;
};

type PredictionCard = {
  name?: string;
  courseName?: string;
  courseCode?: string;
  state?: string;
  rounds?: string;
  quotaCodes?: string;
  candidateCategoryCodes?: string;
  allottedCategoryCodes?: string;
  openingRank?: number;
  closingRank?: number;
  rankGap?: number;
  bucket?: 'safe' | 'target' | 'dream' | string;
  similarCandidates?: Array<{
    rank_num?: number;
    round_no?: number | string;
    candidate_category_code?: string;
    allotted_category_code?: string;
    quota_code?: string;
  }>;
};

const STATE_ALIASES: Record<string, string> = {
  'andhra pradesh': 'Andhra Pradesh',
  ap: 'Andhra Pradesh',
  assam: 'Assam',
  bihar: 'Bihar',
  chhattisgarh: 'Chhattisgarh',
  delhi: 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  goa: 'Goa',
  gujarat: 'Gujarat',
  haryana: 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  hp: 'Himachal Pradesh',
  jharkhand: 'Jharkhand',
  karnataka: 'Karnataka',
  kerala: 'Kerala',
  'madhya pradesh': 'Madhya Pradesh',
  mp: 'Madhya Pradesh',
  maharashtra: 'Maharashtra',
  odisha: 'Odisha',
  orissa: 'Odisha',
  puducherry: 'Puducherry',
  punjab: 'Punjab',
  rajasthan: 'Rajasthan',
  'tamil nadu': 'Tamil Nadu',
  tamilnadu: 'Tamil Nadu',
  tn: 'Tamil Nadu',
  telangana: 'Telangana',
  'uttar pradesh': 'Uttar Pradesh',
  up: 'Uttar Pradesh',
  uttarakhand: 'Uttarakhand',
  'west bengal': 'West Bengal',
  wb: 'West Bengal',
};

@Injectable()
export class AiChatService {
  private stateSlugCache = new Map<string, string>();

  constructor(
    private readonly predictorService: PredictorService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  private async executeTool(name: string, args: any, userId: string): Promise<any> {
    console.log(`[AiChatService.executeTool] Tool executed: "${name}" by User ID: "${userId}". Args:`, JSON.stringify(args, null, 2));
    try {
      let result: any;
      switch (name) {
        case 'predict_colleges': {
          const payload: Record<string, any> = {
            rank: Number(args.rank),
            course_code: args.course || 'MBBS',
            nearby_range: 25000,
            limit: 50,
          };
          if (args.category) {
            payload.candidate_category_code = args.category;
          }
          let predictionResult: any;
          if (args.isStateCounselling && args.state) {
            const stateSlug = await this.resolveStateSlug(args.state);
            console.log(`[AiChatService.executeTool] Resolving state "${args.state}" to slug "${stateSlug || args.state}" for state prediction.`);
            predictionResult = await this.predictorService.predictState(stateSlug || args.state, payload);
          } else {
            predictionResult = await this.predictorService.predictAi(payload);
          }

          if (predictionResult && predictionResult.data) {
            const simplifiedData = predictionResult.data.map((card: any) => ({
              name: card.name,
              course: card.courseCode,
              state: card.state,
              rounds: card.rounds,
              quota: card.quotaCodes,
              closingRank: card.closingRank,
              rankGap: card.rankGap,
              bucket: card.bucket,
            }));
            result = {
              success: predictionResult.success,
              summary: predictionResult.summary,
              data: simplifiedData.slice(0, 30),
            };
          } else {
            result = predictionResult;
          }
          break;
        }

        case 'search_allotment_records': {
          const match: any = {};
          if (args.collegeName) {
            match.instituteNameSnapshot = { contains: args.collegeName, mode: 'insensitive' };
          }
          if (args.course) {
            match.courseNameSnapshot = { contains: args.course, mode: 'insensitive' };
          }
          if (args.quota) {
            match.quotaNameSnapshot = { contains: args.quota, mode: 'insensitive' };
          }
          if (args.category) {
            match.categoryRaw = { contains: args.category, mode: 'insensitive' };
          }
          if (args.minRank || args.maxRank) {
            match.rank = {};
            if (args.minRank) match.rank.gte = Number(args.minRank);
            if (args.maxRank) match.rank.lte = Number(args.maxRank);
          }
          result = await this.prisma.allotmentRecord.findMany({
            where: match,
            take: 15,
            select: {
              sessionYear: true,
              roundNo: true,
              rank: true,
              aiRank: true,
              instituteNameSnapshot: true,
              courseNameSnapshot: true,
              quotaNameSnapshot: true,
              categoryRaw: true,
              feeAmount: true,
            }
          });
          break;
        }

        case 'get_user_profile': {
          const user = await this.prisma.user.findUnique({
            where: { id: userId }
          });
          if (!user) {
            result = { error: 'User not found' };
          } else {
            result = {
              id: user.id,
              phone: user.phone,
              email: user.email,
              name: user.name,
              state: user.state,
              city: user.city,
              country: user.country,
              gender: user.Gender,
              category: user.Category,
              dob: user.dob,
              prefExam: user.PrefExam,
              rank: user.Rank,
              score: user.Score,
              isProfileComplete: user.isProfileComplete,
            };
          }
          break;
        }

        case 'manage_choice_list': {
          const { action, listName, counselling, collegeName, course, quota, category } = args;
          if (action === 'list_all') {
            result = await this.prisma.choiceList.findMany({
              where: { userId },
              select: { id: true, name: true, Caunselling: true }
            });
          } else if (action === 'get') {
            if (!listName) {
              result = { error: 'listName required for action=get' };
            } else {
              const list = await this.prisma.choiceList.findFirst({
                where: { userId, name: listName },
                include: { ChoiceListDetails: true }
              });
              result = list || { message: 'No choice list found with that name' };
            }
          } else if (action === 'add') {
            if (!listName) {
              result = { error: 'listName required' };
            } else if (!collegeName) {
              result = { error: 'collegeName required' };
            } else {
              let list = await this.prisma.choiceList.findFirst({
                where: { userId, name: listName }
              });
              if (!list) {
                list = await this.prisma.choiceList.create({
                  data: {
                    userId,
                    name: listName,
                    Caunselling: counselling || 'All India MCC'
                  }
                });
              }
              const detailName = `${listName}_${collegeName}_${course || 'MBBS'}`;
              const existing = await this.prisma.choiceListDetails.findFirst({
                where: { choiceListId: list.id, name: detailName }
              });
              if (existing) {
                result = { message: 'Choice already exists in list', choice: existing };
              } else {
                const choice = await this.prisma.choiceListDetails.create({
                  data: {
                    choiceListId: list.id,
                    name: detailName,
                    Caunselling: list.Caunselling,
                    Institute: collegeName,
                    Course: course || 'MBBS',
                    Quota: quota || 'AIQ',
                    Catagory: category || 'UR'
                  }
                });
                result = { message: 'Successfully added to choice list', choice };
              }
            }
          } else if (action === 'remove') {
            if (!listName) {
              result = { error: 'listName required' };
            } else if (!collegeName) {
              result = { error: 'collegeName required' };
            } else {
              const list = await this.prisma.choiceList.findFirst({
                where: { userId, name: listName }
              });
              if (!list) {
                result = { error: 'Choice list not found' };
              } else {
                const detailName = `${listName}_${collegeName}_${course || 'MBBS'}`;
                const deleted = await this.prisma.choiceListDetails.deleteMany({
                  where: { choiceListId: list.id, name: detailName }
                });
                result = { message: 'Successfully removed from choice list', count: deleted.count };
              }
            }
          } else {
            result = { error: 'Invalid action' };
          }
          break;
        }

        case 'get_packages': {
          result = await this.prisma.userPackage.findMany({
            where: { userId },
            include: { package: true }
          });
          break;
        }

        case 'search_institutes': {
          const where: any = {};
          if (args.query) {
            where.OR = [
              { name: { contains: args.query, mode: 'insensitive' } },
              { state: { contains: args.query, mode: 'insensitive' } },
              { instituteType: { contains: args.query, mode: 'insensitive' } }
            ];
          }
          if (args.state) {
            where.state = { contains: args.state, mode: 'insensitive' };
          }
          result = await this.prisma.institute.findMany({
            where,
            take: 15,
            select: {
              name: true,
              state: true,
              instituteType: true,
              beds: true,
              seats: true,
              fee: true,
            }
          });
          break;
        }

        default:
          result = { error: `Tool ${name} not found` };
      }
      console.log(`[AiChatService.executeTool] Tool "${name}" output sample (first 1000 chars):`, JSON.stringify(result).substring(0, 1000));
      return result;
    } catch (e: any) {
      console.error(`[AiChatService.executeTool] Error executing tool "${name}":`, e);
      return { error: e.message };
    }
  }

  private async generateAiText(
    userId: string,
    basePrompt: string,
    userSummary?: string,
    recentMessages?: any[],
    allowedToolNames?: string[],
  ): Promise<string> {
    console.log(`[AiChatService.generateAiText] Generating AI Text for User ID: "${userId}". Allowed tools:`, allowedToolNames || 'ALL');
    console.log(`[AiChatService.generateAiText] Base prompt sample (first 500 chars): "${basePrompt.substring(0, 500)}..."`);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    let contextBlock = '';
    if (user) {
      contextBlock += `\n\n[STUDENT ACTIVE PROFILE]`;
      contextBlock += `\n- Name: ${user.name || 'Student'}`;
      contextBlock += `\n- NEET AIR: ${user.Rank || 'Not provided'}`;
      contextBlock += `\n- NEET Score: ${user.Score || 'Not provided'}`;
      contextBlock += `\n- Category: ${user.Category || 'UR/General'}`;
      contextBlock += `\n- Preferred Course: ${user.PrefExam || 'MBBS'}`;
      contextBlock += `\n- Home State: ${user.state || 'Not provided'}`;
      contextBlock += `\n- City: ${user.city || 'Not provided'}`;
      contextBlock += `\n- AI Summary: ${user.aiUserSummurry || 'None'}\n`;
    }

    if (userSummary) {
      contextBlock += `\n[PREVIOUS CHAT SUMMARY]\n${userSummary}\n`;
    }
    if (recentMessages && recentMessages.length > 1) {
      const formattedHistory = recentMessages
        .slice(0, -1)
        .map((m) => `${m.role === 'user' ? 'Student' : 'NEETal AI'}: ${m.content}`)
        .join('\n');
      if (formattedHistory.trim()) {
        contextBlock += `\n[CONVERSATION HISTORY]\n${formattedHistory}\n`;
      }
    }

    const finalPrompt = `${basePrompt}${contextBlock}`;

    // Define function declarations for tools
    const allTools = [
      {
        name: 'predict_colleges',
        description: 'Predict matching colleges based on NEET rank, category, course, counselling level, and quota preference. Rank must be provided.',
        parameters: {
          type: 'OBJECT',
          properties: {
            rank: { type: 'INTEGER', description: 'NEET All India Rank (AIR)' },
            category: { type: 'STRING', description: 'Category code (e.g. UR, OBC, EWS, SC, ST)' },
            course: { type: 'STRING', description: 'Preferred course (e.g. MBBS, BDS)' },
            isStateCounselling: { type: 'BOOLEAN', description: 'Whether to use State counselling instead of All India MCC counselling' },
            state: { type: 'STRING', description: 'State name/code (if isStateCounselling is true)' },
            quota: { type: 'STRING', description: 'Quota preference (e.g. AIQ, AIIMS_OPEN, DEEMED, STATE_QUOTA)' },
          },
          required: ['rank'],
        },
      },
      {
        name: 'search_allotment_records',
        description: 'Query raw allotment records in the database with custom filters (e.g., search by college name, round, rank range, fee, category, course, quota). Use this when student asks about specific college cutoffs or fee info.',
        parameters: {
          type: 'OBJECT',
          properties: {
            collegeName: { type: 'STRING', description: 'Full or partial name of the college' },
            course: { type: 'STRING', description: 'Course name/code (e.g. MBBS, BDS)' },
            quota: { type: 'STRING', description: 'Quota code or name' },
            category: { type: 'STRING', description: 'Category name or code' },
            minRank: { type: 'INTEGER', description: 'Minimum rank' },
            maxRank: { type: 'INTEGER', description: 'Maximum rank' },
          },
        },
      },
      {
        name: 'get_user_profile',
        description: "Get the currently logged-in student's profile details (such as rank, category, home state, score, preferences).",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'manage_choice_list',
        description: "Retrieve, list, create, add, or remove choices from the student's choice list. Perfect for managing their preferred college options.",
        parameters: {
          type: 'OBJECT',
          properties: {
            action: {
              type: 'STRING',
              description: "Action to perform: 'get' (retrieve list by name), 'add' (add college to list), 'remove' (remove college from list), 'list_all' (list all choice lists).",
            },
            listName: { type: 'STRING', description: 'Name of the choice list' },
            counselling: { type: 'STRING', description: "Counselling type (required for action='add' if creating a list)" },
            collegeName: { type: 'STRING', description: 'Name of the college to add or remove' },
            course: { type: 'STRING', description: "Course code (e.g. MBBS, BDS) for action='add'" },
            quota: { type: 'STRING', description: "Quota code (e.g. AIQ) for action='add'" },
            category: { type: 'STRING', description: "Category (e.g. UR) for action='add'" },
          },
          required: ['action'],
        },
      },
      {
        name: 'get_packages',
        description: "Check the student's purchased packages, active payment status, and subscription details.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'search_institutes',
        description: 'Search detailed information about medical colleges/institutes (beds, seats, fee structures, types, state references).',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search query (name, city, state, or type)' },
            state: { type: 'STRING', description: 'State name to filter by' },
          },
        },
      },
    ];

    const filteredDeclarations = allowedToolNames
      ? allTools.filter((t) => allowedToolNames.includes(t.name))
      : allTools;

    const tools = filteredDeclarations.length > 0
      ? ([{ functionDeclarations: filteredDeclarations }] as any)
      : undefined;

    let contents: any[] = [{ role: 'user', parts: [{ text: finalPrompt }] }];
    let loopCount = 0;
    const maxLoops = 5;

    while (loopCount < maxLoops) {
      console.log(`[AiChatService.generateAiText] Model invocation loop: ${loopCount + 1}/${maxLoops}. Input contents count: ${contents.length}`);
      const response = await this.geminiService.ai.models.generateContent({
        model: this.geminiService.model,
        contents,
        ...(tools ? { config: { tools } } : {}),
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall) as any[];

      console.log(`[AiChatService.generateAiText] Candidate response parts:`, JSON.stringify(parts, null, 2));

      if (!functionCalls || functionCalls.length === 0) {
        const textResp = response.text || '';
        console.log(`[AiChatService.generateAiText] No tool calls found. Final text response sample (first 500 chars): "${textResp.substring(0, 500)}..."`);
        return textResp;
      }

      console.log(`[AiChatService.generateAiText] Loop ${loopCount + 1}: Found ${functionCalls.length} tool calls to execute.`);
      const responseParts: any[] = [];
      for (const call of functionCalls) {
        const name = call.functionCall?.name;
        const args = call.functionCall?.args;
        if (!name) continue;

        console.log(`[AiChatService.generateAiText] Loop ${loopCount + 1}: Calling tool "${name}" with args:`, JSON.stringify(args));
        const result = await this.executeTool(name, args, userId);
        responseParts.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }

      // Add model response containing function call to contents
      if (candidate?.content) {
        contents.push(candidate.content);
      }
      // Add tool responses back
      contents.push({
        role: 'user',
        parts: responseParts,
      });

      loopCount++;
    }

    console.log(`[AiChatService.generateAiText] Reached max loop iterations.`);
    return '';
  }

  private async answerExamDateQuestion(userId: string, message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    try {
      const aiPrompt = `
You are NEETal AI Counsellor.

The user is asking about NEET exam dates, registration, admit card, result, or schedule.

Important rules:
- Do not ask for rank/category/course/quota.
- Do not predict colleges.
- Be clear that exam dates must be verified from official NTA/NEET website.
- If you do not have live official data, say that the student should check the official NTA NEET website.
- Use VALID MARKDOWN.
- Use ## headings and bullet points.
- Keep answer short and practical.

Website context:
NEETal is a NEET counselling guidance platform. It helps students understand counselling, cutoffs, quotas, college prediction, choice filling, and official notices.

User question:
${message}

Write a helpful answer.
`;

      const answer = await this.generateAiText(userId, aiPrompt, userSummary, recentMessages, []);

      return (
        answer?.trim() ||
        '## NEET Exam Date\n\nPlease check the official NTA NEET website for the latest exam date, registration, admit card, and result updates.'
      );
    } catch (error) {
      console.error('Gemini exam date answer failed:', error);

      return '## NEET Exam Date\n\nPlease check the official NTA NEET website for the latest exam date, registration, admit card, and result updates.';
    }
  }

  private async answerCollegeInfoQuestion(userId: string, message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    try {
      const aiPrompt = `
You are NEETal AI Counsellor, a warm, professional, and friendly medical college advisor.

The user is asking about a medical college location, fee structure, intake, beds, or details.

Available tools you can call:
- search_institutes: Searches medical college details (seats, beds, fee ranges, state references).
- search_allotment_records: Searches historical allotment records in the database with custom filters.

Rules:
- Address the student by their first name if provided in their profile details.
- Actively call search_institutes or search_allotment_records to get the exact data for the requested college instead of guessing!
- Use VALID MARKDOWN.
- Use ## headings and bullet points.
- Keep answer simple, professional, and useful.

User question:
${message}
`;

      const answer = await this.generateAiText(userId, aiPrompt, userSummary, recentMessages, ['search_institutes', 'search_allotment_records']);

      return (
        answer?.trim() ||
        '## College Information\n\nPlease verify this college information from the official college or counselling website.'
      );
    } catch (error) {
      console.error('Gemini college info answer failed:', error);

      return '## College Information\n\nPlease verify this college information from the official college or counselling website.';
    }
  }

  private async answerGeneralCounsellingQuestion(userId: string, message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    try {
      const aiPrompt = `
You are NEETal AI Counsellor, a warm, professional, and friendly medical counselling advisor for Indian students.

Answer this general NEET UG counselling, medical college admission, process, or cutoff question in simple language.

Available tools you can call:
- predict_colleges: Predicts matching colleges based on rank, category, course, and quota.
- search_allotment_records: Searches historical allotment records in the database with custom filters (useful for specific cutoff questions).
- get_user_profile: Retrieves the active student's profile details.
- manage_choice_list: Manages (gets, adds, removes) college choices in the student's custom choice lists.
- get_packages: Retrieves the active packages/subscriptions.
- search_institutes: Searches medical college details (seats, beds, fee ranges, state references).

Rules:
- Address the student by their first name if provided in their profile details.
- If the question is about specific cutoffs, fee structures, or choices, actively use the appropriate tool to fetch accurate database values rather than guessing.
- Use VALID MARKDOWN only.
- Use ## headings.
- Use bullet points when helpful.
- Keep answer practical for Indian NEET UG students and parents.
- Mention that students should verify final rules from official MCC/state counselling notices when relevant.

Student question:
${message}
`;
      const answer = await this.generateAiText(userId, aiPrompt, userSummary, recentMessages, ['predict_colleges', 'search_allotment_records', 'get_user_profile', 'manage_choice_list', 'get_packages', 'search_institutes']);

      return (
        answer?.trim() ||
        'I can answer this counselling question, but I could not generate a proper explanation right now.'
      );
    } catch (error) {
      console.error('Gemini general answer failed:', error);

      return 'I can answer general counselling questions, but AI explanation is temporarily unavailable.';
    }
  }

private getMissingPredictionFields(
  extracted: ExtractedCounsellingInput,
): string[] {
  const missing: string[] = [];

  if (!extracted.rank) {
    missing.push('rank');
  }

  if (!extracted.category) {
    missing.push('category');
  }

  if (!extracted.course) {
    missing.push('course');
  }

  if (!extracted.scope) {
    missing.push('counselling_type');
  }

  if (extracted.scope === 'STATE' && !extracted.state) {
    missing.push('state');
  }

  /**
   * Quota is important because AIQ, ESI, NRI, Management,
   * Deemed, Minority, State quota can produce very different results.
   */
  if (!extracted.quota) {
    missing.push('quota');
  }

  return missing;
}



private extractQuota(lower: string): string | undefined {
  if (/\b(normal aiq|aiq only|all india quota|aiq|normal all india|normal all india quota|normal mcc)\b/i.test(lower)) {
  return 'AIQ';
}

  if (/\b(aiims open|aiims)\b/i.test(lower)) {
    return 'AIIMS_OPEN';
  }

  if (/\b(esi|insured person|insured persons|ip ward|esi quota)\b/i.test(lower)) {
    return 'ESI';
  }

  if (/\b(nri|nri quota)\b/i.test(lower)) {
    return 'NRI';
  }

  if (/\b(management|paid seat|paid seats|private management)\b/i.test(lower)) {
    return 'MANAGEMENT';
  }

  if (/\b(deemed|deemed university)\b/i.test(lower)) {
    return 'DEEMED';
  }

  if (/\b(minority|muslim|christian)\b/i.test(lower)) {
    return 'MINORITY';
  }

  if (/\b(state quota|state counselling|domicile)\b/i.test(lower)) {
    return 'STATE_QUOTA';
  }

  return undefined;
}
private detectIntent(message: string): ChatIntent {
  const text = message.toLowerCase();

  const examDateKeywords = [
    'next exam',
    'neet exam date',
    'exam date',
    'when will be neet',
    'when is neet',
    'next neet',
    'neet ug date',
    'neet 2026',
    'neet 2027',
    'registration date',
    'admit card',
    'result date',
  ];

  if (examDateKeywords.some((keyword) => text.includes(keyword))) {
    return 'exam_date';
  }

  const collegeInfoKeywords = [
    'where is',
    'located',
    'location',
    'address',
    'city',
    'district',
    'college details',
    'college info',
  ];

  if (collegeInfoKeywords.some((keyword) => text.includes(keyword))) {
    return 'college_info';
  }

  const predictionKeywords = [
    'can i get',
    'what can i get',
    'which college',
    'which colleges',
    'my chances',
    'predict',
    'prediction',
    'safe option',
    'safe options',
    'target option',
    'target options',
    'dream option',
    'dream options',
    'choice filling',
    'rank is',
    'my rank',
    'air',
  ];

  if (predictionKeywords.some((keyword) => text.includes(keyword))) {
    return 'prediction';
  }

  const generalKeywords = [
    'what is',
    'what are',
    'explain',
    'meaning',
    'quota',
    'esi',
    'nri',
    'management',
    'deemed',
    'aiq',
    'all india quota',
    'documents',
    'security deposit',
    'counselling process',
    'mcc',
    'round',
    'seat matrix',
  ];

  if (generalKeywords.some((keyword) => text.includes(keyword))) {
    return 'general_counselling';
  }

  return 'general_counselling';
}

  async chat(userId: string, message: string, chatHistoryId?: string) {
    const trimmed = message.trim();
    console.log(`[AiChatService.chat] Incoming message for User: "${userId}", ChatHistoryId: "${chatHistoryId}". Message: "${trimmed}"`);

    if (!trimmed) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      return {
        success: false,
        answer: 'Please type your NEET rank, category, state, course, and quota preference.',
        aiCredits: user?.aiCredits || 0,
      };
    }

    // 1. Fetch user & check flags
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      console.log(`[AiChatService.chat] User not found for ID: "${userId}"`);
      throw new UnauthorizedException('User not found.');
    }
    console.log(`[AiChatService.chat] User details fetched: Name: "${user.name}", Category: "${user.Category}", Rank: ${user.Rank}, State: "${user.state}"`);

    if (!user.isAiEnabled) {
      console.log(`[AiChatService.chat] User isAiEnabled is false. Throwing Forbidden.`);
      throw new ForbiddenException('AI features are not enabled for your account.');
    }

    if (user.isAiCreditSystem) {
      if (user.aiCredits <= 0) {
        console.log(`[AiChatService.chat] User is out of AI credits (${user.aiCredits}).`);
        throw new ForbiddenException('You have run out of AI credits. Please recharge.');
      }
    }

    // 2. Fetch or create chat history
    let historyId = chatHistoryId;
    if (historyId) {
      const history = await this.prisma.aiChatHistory.findUnique({
        where: { id: historyId },
      });
      if (!history || history.userId !== userId) {
        console.log(`[AiChatService.chat] Chat history not found or unauthorized for historyId: "${historyId}"`);
        throw new NotFoundException('Chat history not found.');
      }
    } else {
      const newHistory = await this.prisma.aiChatHistory.create({
        data: {
          userId,
          title: trimmed.substring(0, 30) || 'New Chat',
        },
      });
      historyId = newHistory.id;
      console.log(`[AiChatService.chat] Created new chat history: "${historyId}" with title: "${newHistory.title}"`);
    }

    // 3. Save user message to database
    await this.prisma.aiMessages.create({
      data: {
        aiChatHistoryId: historyId,
        role: 'user',
        content: trimmed,
      },
    });

    // 4. Fetch recent messages for context
    const recentMessages = await this.prisma.aiMessages.findMany({
      where: { aiChatHistoryId: historyId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    console.log(`[AiChatService.chat] Fetched ${recentMessages.length} recent messages for historyId: "${historyId}"`);

    // 5. Run standard logic
    const extracted = this.extractCounsellingInput(trimmed);
    console.log(`[AiChatService.chat] Extracted fields from message text:`, JSON.stringify(extracted, null, 2));

    // Merge student stats from their profile as fallbacks if missing from query
    if (!extracted.rank && user.Rank) {
      extracted.rank = user.Rank;
    }
    if (!extracted.category && user.Category && user.Category !== 'N/A' && user.Category.toLowerCase() !== 'general') {
      extracted.category = user.Category;
    }
    if (!extracted.state && user.state && user.state !== 'N/A') {
      extracted.state = user.state;
      if (!extracted.scope) {
        extracted.scope = 'STATE';
      }
    }
    if (!extracted.course && user.PrefExam && user.PrefExam !== 'N/A') {
      extracted.course = user.PrefExam;
    }
    console.log(`[AiChatService.chat] Merged extracted inputs (after user profile fallback):`, JSON.stringify(extracted, null, 2));

    const intent = this.detectIntent(trimmed);
    console.log(`[AiChatService.chat] Detected message intent: "${intent}"`);

    let responseData: any = {};

    if (intent === 'exam_date') {
      console.log(`[AiChatService.chat] Directing to exam_date flow`);
      const answer = await this.answerExamDateQuestion(userId, trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'exam_date_answer',
        intent,
        extracted,
        answer,
      };
    } else if (intent === 'college_info') {
      console.log(`[AiChatService.chat] Directing to college_info flow`);
      const answer = await this.answerCollegeInfoQuestion(userId, trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'college_info_answer',
        intent,
        extracted,
        answer,
      };
    } else if (intent === 'general_counselling') {
      console.log(`[AiChatService.chat] Directing to general_counselling flow`);
      const answer = await this.answerGeneralCounsellingQuestion(userId, trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'general_counselling_answer',
        intent,
        extracted,
        answer,
      };
    } else {
      // Prediction logic
      console.log(`[AiChatService.chat] Directing to prediction flow`);
      let prediction: any = null;
      let rawCards: any[] = [];
      let cards: any[] = [];

      if (extracted.rank) {
        const predictorPayload: Record<string, any> = {
          rank: extracted.rank,
          course_code: extracted.course || 'MBBS',
          nearby_range: 25000,
          limit: 50,
        };

        if (extracted.category) {
          predictorPayload.candidate_category_code = extracted.category;
        }

        console.log(`[AiChatService.chat] Prediction Payload:`, JSON.stringify(predictorPayload, null, 2));
        if (extracted.scope === 'STATE' && extracted.state) {
          const stateSlug = await this.resolveStateSlug(extracted.state);
          console.log(`[AiChatService.chat] Resolving state "${extracted.state}" to slug "${stateSlug || extracted.state}" for state prediction.`);
          prediction = await this.predictorService.predictState(stateSlug || extracted.state, predictorPayload);
        } else {
          console.log(`[AiChatService.chat] Executing predictAi`);
          prediction = await this.predictorService.predictAi(predictorPayload);
        }

        rawCards = prediction?.data || [];
        console.log(`[AiChatService.chat] Predictor returned ${rawCards.length} raw cards. Status: ${prediction?.success}. Message if failed: ${prediction?.message}`);
        cards = this.filterSpecialQuotaCards(rawCards, trimmed);
        console.log(`[AiChatService.chat] Filtered special quota cards. Remaining visible cards: ${cards.length}`);
      } else {
        console.log(`[AiChatService.chat] No rank extracted or fallback found. Skipping prediction DB query.`);
      }

      let aiAnswer = '';
      try {
        const hiddenCount = rawCards.length - cards.length;
        const missingFieldsList = ['rank', 'category', 'course', 'counselling_type', 'quota'].filter(f => !extracted[f === 'counselling_type' ? 'scope' : f]);

        const simplifiedCardsForPrompt = cards.slice(0, 15).map((card: any) => ({
          name: card.name,
          course: card.courseCode,
          state: card.state,
          rounds: card.rounds,
          quota: card.quotaCodes,
          closingRank: card.closingRank,
          rankGap: card.rankGap,
          bucket: card.bucket,
        }));

        const aiPrompt = `
You are NEETal AI Counsellor, a highly professional, encouraging, and expert medical counselling advisor for Indian students.

You have access to 6 advanced tools to help answer student queries:
- predict_colleges: Predicts matching colleges based on rank, category, course, and quota.
- search_allotment_records: Searches historical allotment records in the database with custom filters (useful for specific cutoff questions).
- get_user_profile: Retrieves the active student's profile details.
- manage_choice_list: Manages (gets, adds, removes) college choices in the student's custom choice lists.
- get_packages: Retrieves the active packages/subscriptions.
- search_institutes: Searches medical college details (seats, beds, fee ranges, state references).

Active Guidelines:
1. Address the student by their first name if provided in their profile details.
2. If the student has not provided their NEET All India Rank (AIR), ask them for it and other missing details naturally at the end of your response.
3. If some details (like category, course, counselling type, or quota) were not provided by the student, mention the assumption you made (e.g., General category, MBBS course, All India Quota) and ask them naturally at the end of your response to provide those missing details if they want to refine the prediction.
4. Do not guess colleges. Do not add any college that is not present in the predictor result.
5. Do not say "guaranteed admission", "confirmed seat", or "sure shot". Use "comparatively safer" instead of "safe".
6. If special quota results were hidden, clearly mention that ESI/NRI/Management/Minority/CW/IP quota results were hidden because the student did not mention eligibility.
7. If any visible result has special quota, warn the student to verify eligibility.
8. Encourage the student to check and organize their options. You can mention that you can add any of these colleges to their choice list for them if they tell you to!
9. Return VALID MARKDOWN only. Every section heading must start with ##. Every college must be shown as a bullet point using "-". College names must be bold using **College Name**.

Student question:
${trimmed}

Extracted student details:
${JSON.stringify(extracted, null, 2)}

Predictor summary:
${JSON.stringify(
  {
    ...(prediction?.summary || {}),
    visibleCardsAfterFiltering: cards.length,
    hiddenSpecialQuotaCards: hiddenCount,
  },
  null,
  2,
)}

Visible predictor result:
${JSON.stringify(simplifiedCardsForPrompt, null, 2)}

Now write the final answer. If you have predictor results, structure it like this:

## Short Summary

Explain the result in 2-3 short lines, mentioning any default assumptions you made if details were missing.

## Comparatively Safer Options

- **College Name** — previous closing rank, quota, and why it is comparatively safer.

## Target Options

- **College Name** — previous closing rank, quota, and why it is a target option.

## Dream / Risky Options

- **College Name** — previous closing rank, quota, and why it is risky.

## Important Warning

- Mention official counselling verification.
- Mention quota eligibility if needed.
- Mention that this is not guaranteed admission.
`;

        console.log(`[AiChatService.chat] Invoking generateAiText for prediction explanation...`);
        const geminiAnswer = await this.generateAiText(userId, aiPrompt, user.aiUserSummurry || undefined, recentMessages, ['manage_choice_list', 'get_packages', 'get_user_profile']);
        if (geminiAnswer?.trim()) {
          aiAnswer = geminiAnswer.trim();
        }
      } catch (error) {
        console.error('[AiChatService.chat] Gemini explanation failed:', error);
      }

      if (!aiAnswer) {
        console.log(`[AiChatService.chat] Gemini explanation was empty. Falling back to buildHumanAnswer (static templates).`);
        aiAnswer = this.buildHumanAnswer(
          extracted,
          cards,
          {
            ...(prediction?.summary || {}),
            totalCards: cards.length,
            rawTotalCards: rawCards.length,
          },
        );
      }

      responseData = {
        success: true,
        type: 'prediction_answer',
        extracted,
        summary: {
          ...(prediction?.summary || {}),
          visibleCardsAfterFiltering: cards.length,
          hiddenSpecialQuotaCards: rawCards.length - cards.length,
        },
        data: cards,
        answer: aiAnswer,
      };
    }

    // 6. Save AI's response to database
    if (responseData.answer) {
      await this.prisma.aiMessages.create({
        data: {
          aiChatHistoryId: historyId,
          role: 'model',
          content: responseData.answer,
        },
      });
    }

    let remainingCredits = user.aiCredits;
    // 7. Deduct credit if credit system is enabled
    if (user.isAiCreditSystem) {
      remainingCredits = Math.max(0, user.aiCredits - 1);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          aiCredits: {
            decrement: 1,
          },
        },
      });
      console.log(`[AiChatService.chat] Deducted 1 credit. Remaining credits: ${remainingCredits}`);
    }

    // 8. Auto-summarize & Title Update asynchronously in the background
    Promise.resolve().then(async () => {
      try {
        await this.updateChatTitle(historyId);
        await this.updateUserSummary(userId);
      } catch (err) {
        console.error('Background AI post-processing failed:', err);
      }
    });

    console.log(`[AiChatService.chat] Returning response. Answer length: ${responseData.answer?.length || 0}`);
    return {
      ...responseData,
      chatHistoryId: historyId,
      aiCredits: remainingCredits,
    };
  }

  private extractCounsellingInput(message: string): ExtractedCounsellingInput {
  const lower = message.toLowerCase();

  const rank = this.extractRank(message);
  const category = this.extractCategory(lower);
  const state = this.extractState(lower);
  const course = this.extractCourse(lower);
  const quota = this.extractQuota(lower);

  const asksAllIndia = /\b(aiq|all india|mcc|all indian|through all india)\b/i.test(message);
  const asksState = /\b(state counselling|state quota|state)\b/i.test(message);

  let scope: CounsellingScope = undefined;

  if (asksAllIndia) {
    scope = 'ALL_INDIA';
  } else if (asksState || state) {
    scope = 'STATE';
  }

  return {
    rank,
    category,
    state,
    course,
    quota,
    scope,
  };
}
  private extractRank(message: string): number | undefined {
    const cleanMsg = message.replace(/,/g, '');
    
    // 1. Context patterns with optional multipliers
    const contextPatterns = [
      /(?:rank|air|neet rank|all india rank)\s*(?:is|=|:)?\s*([0-9]+(?:\.[0-9]+)?)\s*[-]?\s*(k|lakhs?|lacs?|l)?\b/i,
      /\b([0-9]+(?:\.[0-9]+)?)\s*[-]?\s*(k|lakhs?|lacs?|l)?\s*(?:rank|air)\b/i
    ];

    for (const pattern of contextPatterns) {
      const match = cleanMsg.match(pattern);
      if (match) {
        const numStr = match[1];
        const suffix = match[2];
        let val = parseFloat(numStr);
        if (Number.isFinite(val) && val > 0) {
          if (suffix) {
            const s = suffix.toLowerCase();
            if (s === 'k') val *= 1000;
            else if (s === 'l' || s.startsWith('lakh') || s.startsWith('lac')) val *= 100000;
          }
          return Math.round(val);
        }
      }
    }

    // 2. Loose patterns: numbers with multipliers anywhere in the message
    // e.g. "40k" or "1.2 Lakh"
    const looseMultiplierPattern = /\b([0-9]+(?:\.[0-9]+)?)\s*[-]?\s*(k|lakhs?|lacs?|l)\b/i;
    const looseMultMatch = cleanMsg.match(looseMultiplierPattern);
    if (looseMultMatch) {
      const numStr = looseMultMatch[1];
      const suffix = looseMultMatch[2];
      let val = parseFloat(numStr);
      if (Number.isFinite(val) && val > 0) {
        const s = suffix.toLowerCase();
        if (s === 'k') val *= 1000;
        else if (s === 'l' || s.startsWith('lakh') || s.startsWith('lac')) val *= 100000;
        return Math.round(val);
      }
    }

    // 3. Loose pure numbers: e.g. "120000" or "40000"
    const loosePureNumbers = cleanMsg.match(/\b([0-9]{4,})\b/g); // 4 or more digits, e.g. >= 1000
    if (loosePureNumbers?.length) {
      const val = Number(loosePureNumbers[0]);
      if (Number.isFinite(val) && val > 0) return val;
    }

    return undefined;
  }

  private async resolveStateSlug(stateInput?: string): Promise<string | undefined> {
    if (!stateInput) return undefined;
    const cacheKey = stateInput.trim().toLowerCase();
    if (this.stateSlugCache.has(cacheKey)) {
      console.log(`[AiChatService.resolveStateSlug] Cache hit for "${stateInput}" -> "${this.stateSlugCache.get(cacheKey)}"`);
      return this.stateSlugCache.get(cacheKey);
    }
    
    // First normalize the input using STATE_ALIASES if possible
    let normalizedState = stateInput.trim();
    const lower = normalizedState.toLowerCase();
    
    // Check if it matches an alias
    const entries = Object.entries(STATE_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [alias, state] of entries) {
      const pattern = new RegExp(`(^|\\s)${alias.replace(/ /g, '\\s+')}($|\\s)`, 'i');
      if (pattern.test(lower)) {
        normalizedState = state;
        break;
      }
    }

    // Now query the DB
    const stateRecord = await this.prisma.state.findFirst({
      where: {
        OR: [
          { name: { equals: normalizedState, mode: 'insensitive' } },
          { slug: { equals: normalizedState.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
          { code: { equals: normalizedState, mode: 'insensitive' } }
        ]
      }
    });

    let slug: string;
    if (stateRecord) {
      slug = stateRecord.slug;
    } else {
      // Fallback: kebab-case
      slug = normalizedState.toLowerCase().replace(/\s+/g, '-');
    }

    this.stateSlugCache.set(cacheKey, slug);
    console.log(`[AiChatService.resolveStateSlug] Cache miss for "${stateInput}". Querying DB -> resolved to "${slug}"`);
    return slug;
  }

  private extractCategory(lower: string): string | undefined {
    const orderedCategories = [
      'OBC-NCL',
      'OBC',
      'EWS',
      'SC',
      'ST',
      'UR',
      'GENERAL',
      'OPEN',
    ];

    for (const category of orderedCategories) {
      const pattern = new RegExp(`\\b${category.toLowerCase().replace('-', '[- ]?')}\\b`, 'i');
      if (pattern.test(lower)) {
        if (category === 'GENERAL' || category === 'OPEN') return 'UR';
        return category;
      }
    }

    return undefined;
  }

  private extractCourse(lower: string): string | undefined {
    const courses = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BASLP'];
    return courses.find((course) => lower.includes(course.toLowerCase()));
  }

  private extractState(lower: string): string | undefined {
    const normalized = lower.replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const entries = Object.entries(STATE_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [alias, state] of entries) {
      const pattern = new RegExp(`(^|\\s)${alias.replace(/ /g, '\\s+')}($|\\s)`, 'i');
      if (pattern.test(normalized)) return state;
    }

    return undefined;
  }

  private buildHumanAnswer(
    extracted: ExtractedCounsellingInput,
    cards: PredictionCard[],
    summary: any,
  ): string {
    const safe = cards.filter((card) => card.bucket === 'safe').slice(0, 5);
    const target = cards.filter((card) => card.bucket === 'target').slice(0, 5);
    const dream = cards.filter((card) => card.bucket === 'dream').slice(0, 5);

    const scopeText = extracted.scope === 'STATE' ? `${extracted.state} state counselling` : 'All India MCC counselling';
    const categoryText = extracted.category ? `, category ${extracted.category}` : '';
    const courseText = extracted.course || 'MBBS';

    const sections = [
      `I checked your imported predictor database for **rank ${this.formatRank(extracted.rank)}${categoryText}, ${courseText}, ${scopeText}**.`,
      `Found **${summary?.totalCards ?? cards.length} college/course matches** near your rank range.`,
    ];

    if (safe.length) {
      sections.push(`\n**Safer options**\n${this.formatCards(safe)}`);
    }
    if (target.length) {
      sections.push(`\n**Target options**\n${this.formatCards(target)}`);
    }
    if (dream.length) {
      sections.push(`\n**Dream / risky options**\n${this.formatCards(dream)}`);
    }

    if (!cards.length) {
      sections.push(
        '\nI could not find close matches for these exact filters. Try increasing nearby range or removing category/quota filter.',
      );
    }

    sections.push(
      '\n**How to read this:** safer means previous closing rank was worse than your rank, target means near your rank, and dream means previous cutoff was better than your rank. Final counselling can still change due to seat matrix, category movement, round variation, and official rules.',
    );

    return sections.join('\n');
  }

  private formatCards(cards: PredictionCard[]): string {
    return cards
      .map((card, index) => {
        const gap = typeof card.rankGap === 'number' ? `, gap ${this.formatRank(Math.abs(card.rankGap))}` : '';
        const rounds = card.rounds ? `, rounds ${card.rounds}` : '';
        const quota = card.quotaCodes ? `, quota ${card.quotaCodes}` : '';
        return `${index + 1}. ${card.name || 'College'} — closing rank ${this.formatRank(card.closingRank)}${gap}${rounds}${quota}`;
      })
      .join('\n');
  }

private formatRank(rank?: number): string {
  if (!rank) return '-';
  return rank.toLocaleString('en-IN');
}

private looksLikePredictionQuestion(message: string): boolean {
  const text = message.toLowerCase();

  const predictionKeywords = [
    'can i get',
    'which college',
    'which colleges',
    'what can i get',
    'my chances',
    'predict',
    'safe',
    'target',
    'dream',
    'rank',
    'closing rank',
    'cutoff',
    'cut off',
  ];

  return predictionKeywords.some((keyword) => text.includes(keyword));
}
private isSpecialQuota(quotaText: string): boolean {
  const quota = (quotaText || '').toLowerCase();

  const specialKeywords = [
    'esi',
    'insured',
    'nri',
    'management',
    'paid',
    'deemed',
    'minority',
    'muslim',
    'christian',
    'armed',
    'defence',
    'cw quota',
    'ip quota',
    'institutional',
    'internal',
  ];

  return specialKeywords.some((keyword) => quota.includes(keyword));
}

private userAskedForSpecialQuota(message: string): boolean {
  const text = (message || '').toLowerCase();

  const allowedKeywords = [
    'esi',
    'insured',
    'nri',
    'management',
    'paid',
    'deemed',
    'minority',
    'defence',
    'armed',
    'cw quota',
    'ip quota',
    'private',
  ];

  return allowedKeywords.some((keyword) => text.includes(keyword));
}

private filterSpecialQuotaCards(
  cards: PredictionCard[],
  message: string,
): PredictionCard[] {
  if (this.userAskedForSpecialQuota(message)) {
    return cards;
  }

  return cards.filter((card) => {
    const quotaText = [
      card.quotaCodes,
      card.candidateCategoryCodes,
      card.allottedCategoryCodes,
      ...(card.similarCandidates || []).map((candidate) => candidate.quota_code),
    ]
      .filter(Boolean)
      .join(' ');

    return !this.isSpecialQuota(quotaText);
  });
}

  // ==========================================
  // 📚 CRUD CHAT HISTORY
  // ==========================================

  async getHistory(userId: string) {
    return this.prisma.aiChatHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getHistoryById(userId: string, historyId: string) {
    const history = await this.prisma.aiChatHistory.findUnique({
      where: { id: historyId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!history || history.userId !== userId) {
      throw new NotFoundException('Chat history not found.');
    }

    return history;
  }

  async deleteHistory(userId: string, historyId: string) {
    const history = await this.prisma.aiChatHistory.findUnique({
      where: { id: historyId },
    });

    if (!history || history.userId !== userId) {
      throw new NotFoundException('Chat history not found.');
    }

    await this.prisma.aiChatHistory.delete({
      where: { id: historyId },
    });

    return { success: true, message: 'Chat history and associated messages deleted.' };
  }

  // ==========================================
  // 🧠 BACKGROUND SUMMARIZATION HELPERS
  // ==========================================

  private async updateChatTitle(historyId: string) {
    try {
      const messages = await this.prisma.aiMessages.findMany({
        where: { aiChatHistoryId: historyId },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      if (messages.length === 0) return;

      const chatContent = messages
        .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
        .join('\n');

      const prompt = `
You are an assistant. Create a very short (3-5 words) descriptive title for this conversation between a NEET student and an AI counsellor. Do not use quotes, markdown, or any introductory text. Return only the title.

Conversation:
${chatContent}
`;

      const title = await this.geminiService.generateText(prompt);
      if (title?.trim()) {
        await this.prisma.aiChatHistory.update({
          where: { id: historyId },
          data: { title: title.trim().replace(/^["']|["']$/g, '') },
        });
      }
    } catch (err) {
      console.error('Failed to update chat title:', err);
    }
  }

  private async updateUserSummary(userId: string) {
    try {
      const chats = await this.prisma.aiChatHistory.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      const allChatContent = chats
        .map((chat) => {
          const messagesText = chat.messages
            .map((m) => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`)
            .join('\n');
          return `--- Chat Session: ${chat.title} ---\n${messagesText}`;
        })
        .join('\n\n');

      if (!allChatContent.trim()) return;

      const prompt = `
You are an assistant. Create a concise, one-paragraph summary of the student's profile, preferences, and details based on their chat history below.
Include their NEET rank, category, home state, course interests, and quota details if mentioned anywhere in the chats.
Keep it objective, factual, and strictly under 100 words. Do not write introductory text.

Chat History:
${allChatContent}
`;

      const summary = await this.geminiService.generateText(prompt);
      if (summary?.trim()) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { aiUserSummurry: summary.trim() },
        });
      }
    } catch (err) {
      console.error('Failed to update user summary:', err);
    }
  }
}
