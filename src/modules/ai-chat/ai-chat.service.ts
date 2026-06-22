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
  constructor(
    private readonly predictorService: PredictorService,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  private async generateAiText(basePrompt: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    let contextBlock = '';
    if (userSummary) {
      contextBlock += `\n\n[STUDENT PROFILE SUMMARY]\nThis is the info of the student: ${userSummary}\n`;
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
    return this.geminiService.generateText(finalPrompt);
  }

  private async answerExamDateQuestion(message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
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

      const answer = await this.generateAiText(aiPrompt, userSummary, recentMessages);

      return (
        answer?.trim() ||
        '## NEET Exam Date\n\nPlease check the official NTA NEET website for the latest exam date, registration, admit card, and result updates.'
      );
    } catch (error) {
      console.error('Gemini exam date answer failed:', error);

      return '## NEET Exam Date\n\nPlease check the official NTA NEET website for the latest exam date, registration, admit card, and result updates.';
    }
  }

  private async answerCollegeInfoQuestion(message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    try {
      const aiPrompt = `
You are NEETal AI Counsellor.

The user is asking about a medical college location/details.

Rules:
- Do not ask for rank/category/course/quota.
- Do not predict admission chances.
- If the college location is clear from the name, answer directly.
- Use VALID MARKDOWN.
- Use ## headings and bullet points.
- Keep answer simple and useful.
- If unsure, say the user should verify from official college/MCC/state counselling website.

User question:
${message}

Write a helpful answer.
`;

      const answer = await this.generateAiText(aiPrompt, userSummary, recentMessages);

      return (
        answer?.trim() ||
        '## College Information\n\nPlease verify this college information from the official college or counselling website.'
      );
    } catch (error) {
      console.error('Gemini college info answer failed:', error);

      return '## College Information\n\nPlease verify this college information from the official college or counselling website.';
    }
  }

  private isGeneralCounsellingQuestion(message: string): boolean {
    const text = message.toLowerCase();

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
      'choice filling',
      'counselling process',
      'mcc',
      'round',
      'seat matrix',
      'where is',
      'located',
      'location',
      'address',
      'city',
      'district',
      'state of college',
      'college info',
      'college details',
    ];

    return generalKeywords.some((keyword) => text.includes(keyword));
  }

  private async answerGeneralCounsellingQuestion(message: string, userSummary?: string, recentMessages?: any[]): Promise<string> {
    try {
      const aiPrompt = `
You are NEETal AI Counsellor.

Answer this general NEET UG counselling or medical college question in simple language.

Rules:
- Do not predict colleges unless rank/category/course/quota are provided.
- Do not ask for rank if the user is asking about quota, location, address, documents, process, or college details.
- If the user asks where a college is located, answer the location directly if clear from the college name.
- Use VALID MARKDOWN only.
- Use ## headings.
- Use bullet points when helpful.
- Keep answer practical for Indian NEET UG students and parents.
- If the question is about quota, explain eligibility clearly.
- Mention that students should verify final rules from official MCC/state counselling notices when relevant.

Student question:
${message}
`;
      const answer = await this.generateAiText(aiPrompt, userSummary, recentMessages);

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

private buildMissingInfoAnswer(
  extracted: ExtractedCounsellingInput,
  missingFields: string[],
): string {
  const lines: string[] = [];

  lines.push('## I need a few more details');
  lines.push('');
  lines.push('To give a reliable counselling prediction, please provide the missing information below:');
  lines.push('');

  if (missingFields.includes('rank')) {
    lines.push('- **NEET rank** — example: `45000`');
  }

  if (missingFields.includes('category')) {
    lines.push('- **Category** — example: `UR`, `EWS`, `OBC`, `OBC-NCL`, `SC`, `ST`');
  }

  if (missingFields.includes('course')) {
    lines.push('- **Course** — example: `MBBS`, `BDS`, `BAMS`, `BHMS`');
  }

  if (missingFields.includes('counselling_type')) {
    lines.push('- **Counselling type** — choose `All India MCC` or `State counselling`');
  }

  if (missingFields.includes('state')) {
    lines.push('- **State** — example: `Bihar`, `Uttar Pradesh`, `Maharashtra`, `Tamil Nadu`');
  }

  if (missingFields.includes('quota')) {
    lines.push('- **Quota preference** — choose one option from below');
    lines.push('');
    lines.push('### Common quota options');
    lines.push('');
    lines.push('- **Normal All India Quota / AIQ** — for regular MCC All India seats');
    lines.push('- **AIIMS Open** — for AIIMS seats through MCC');
    lines.push('- **ESI Insured Persons quota** — only if you have valid ESI eligibility');
    lines.push('- **Deemed University** — for deemed university counselling');
    lines.push('- **NRI quota** — only if eligible');
    lines.push('- **Management/Paid seats** — mostly private/deemed options');
    lines.push('- **State quota** — for state counselling and domicile-based seats');
  }

  lines.push('');
  lines.push('### Reply example');
  lines.push('');
  lines.push('`My rank is 45000, category EWS, course MBBS, All India MCC, normal AIQ only.`');

  if (extracted.scope === 'STATE') {
    lines.push('');
    lines.push('For state counselling, you can say:');
    lines.push('');
    lines.push('`My rank is 85000, category OBC, course MBBS, Bihar state counselling, state quota.`');
  }

  return lines.join('\n');
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
      throw new UnauthorizedException('User not found.');
    }

    if (!user.isAiEnabled) {
      throw new ForbiddenException('AI features are not enabled for your account.');
    }

    if (user.isAiCreditSystem) {
      if (user.aiCredits <= 0) {
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

    // 5. Run standard logic
    const extracted = this.extractCounsellingInput(trimmed);
    const intent = this.detectIntent(trimmed);

    let responseData: any = {};

    if (intent === 'exam_date') {
      const answer = await this.answerExamDateQuestion(trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'exam_date_answer',
        intent,
        extracted,
        answer,
      };
    } else if (intent === 'college_info') {
      const answer = await this.answerCollegeInfoQuestion(trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'college_info_answer',
        intent,
        extracted,
        answer,
      };
    } else if (intent === 'general_counselling') {
      const answer = await this.answerGeneralCounsellingQuestion(trimmed, user.aiUserSummurry || undefined, recentMessages);
      responseData = {
        success: true,
        type: 'general_counselling_answer',
        intent,
        extracted,
        answer,
      };
    } else {
      // Prediction logic
      const missingFields = this.getMissingPredictionFields(extracted);

      if (missingFields.length > 0) {
        responseData = {
          success: true,
          type: 'missing_information',
          extracted,
          missingFields,
          answer: this.buildMissingInfoAnswer(extracted, missingFields),
        };
      } else {
        // All fields available, call predictor
        const predictorPayload: Record<string, any> = {
          rank: extracted.rank,
          course_code: extracted.course || 'MBBS',
          nearby_range: 25000,
          limit: 50,
        };

        if (extracted.category) {
          predictorPayload.candidate_category_code = extracted.category;
        }

        const prediction =
          extracted.scope === 'STATE' && extracted.state
            ? await this.predictorService.predictState(extracted.state, predictorPayload)
            : await this.predictorService.predictAi(predictorPayload);

        if (!prediction?.success) {
          responseData = {
            success: false,
            type: 'predictor_error',
            extracted,
            answer:
              prediction?.message ||
              'I could not fetch prediction data right now. Please check if the predictor database is connected.',
          };
        } else {
          const rawCards = prediction.data || [];
          const cards = this.filterSpecialQuotaCards(rawCards, trimmed);
          const fallbackAnswer = this.buildHumanAnswer(
            extracted,
            cards,
            {
              ...(prediction.summary || {}),
              totalCards: cards.length,
              rawTotalCards: rawCards.length,
            },
          );

          let aiAnswer = fallbackAnswer;

          try {
            const hiddenCount = rawCards.length - cards.length;
            const aiPrompt = `
You are NEETal AI Counsellor.

Your job:
Explain NEET counselling prediction results in simple language for Indian students and parents.

Very important rules:
1. Do not guess colleges.
2. Do not add any college that is not present in the predictor result.
3. Use only the predictor result given below.
4. Do not say "guaranteed admission", "confirmed seat", or "sure shot".
5. Use "comparatively safer" instead of "safe".
6. If special quota results were hidden, clearly mention that ESI/NRI/Management/Minority/CW/IP quota results were hidden because the student did not mention eligibility.
7. If any visible result has special quota, warn the student to verify eligibility.
8. Final counselling depends on official MCC/state rules, seat matrix, category movement, and round-wise variation.
9. Return VALID MARKDOWN only.
10. Every section heading must start with ##.
11. Every college must be shown as a bullet point using "-".
12. College names must be bold using **College Name**.
13. Keep answer professional, concise, and useful.

Student question:
${trimmed}

Extracted student details:
${JSON.stringify(extracted, null, 2)}

Predictor summary:
${JSON.stringify(
  {
    ...(prediction.summary || {}),
    visibleCardsAfterFiltering: cards.length,
    hiddenSpecialQuotaCards: hiddenCount,
  },
  null,
  2,
)}

Visible predictor result:
${JSON.stringify(cards.slice(0, 15), null, 2)}

Now write the final answer using exactly this structure:

## Short Summary

Explain the result in 2-3 short lines.

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

            const geminiAnswer = await this.generateAiText(aiPrompt, user.aiUserSummurry || undefined, recentMessages);

            if (geminiAnswer?.trim()) {
              aiAnswer = geminiAnswer.trim();
            }
          } catch (error) {
            console.error('Gemini explanation failed:', error);
          }

          responseData = {
            success: true,
            type: 'prediction_answer',
            extracted,
            summary: {
              ...(prediction.summary || {}),
              visibleCardsAfterFiltering: cards.length,
              hiddenSpecialQuotaCards: rawCards.length - cards.length,
            },
            data: cards,
            answer: aiAnswer,
          };
        }
      }
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
    const patterns = [
      /(?:rank|air|neet rank|all india rank)\s*(?:is|=|:)?\s*([0-9][0-9,]*)/i,
      /([0-9][0-9,]*)\s*(?:rank|air)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        const value = Number(match[1].replace(/,/g, ''));
        if (Number.isFinite(value) && value > 0) return value;
      }
    }

    const looseNumbers = message.match(/\b[0-9][0-9,]{3,}\b/g);
    if (looseNumbers?.length) {
      const value = Number(looseNumbers[0].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) return value;
    }

    return undefined;
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
