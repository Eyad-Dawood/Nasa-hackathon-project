import { GameCatalog } from "./data/GameCatalog";
import type {
  FlightDirectorIntent,
  IntentClassification,
  SupportedLanguage,
} from "./types/AiTypes";

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const PART_ID_TOKEN_REGEX = /\b(?:PT|SC|CM|SI)\d{2}\b/gi;
const MISSION_ID_TOKEN_REGEX = /\bM0[1-6]\b/gi;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+|your\s+)?(?:previous\s+|prior\s+)?instructions/i,
  /(?:reveal|show|print|dump|leak)\s+(?:your\s+|the\s+)?(?:system\s*prompt|instructions|api\s*key|env|secrets?)/i,
  /(?:GEMINI_API_KEY|process\.env)/i,
  /(?:bypass|override|disable)\s+(?:all\s+)?(?:12\s+)?(?:rules|checks|audit|guardrails|validation)/i,
  /(?:pretend|say|claim|confirm)\s+(?:that\s+)?(?:the\s+)?ship\s+(?:is\s+ready|passes?\s+(?:all\s+)?12)/i,
  /developer\s+mode|jailbreak/i,
  /تجاهل\s+(?:كل\s+)?التعليمات/i,
  /اعرض\s+(?:كلمة\s+السر|المفتاح|موجه\s+النظام)/i,
  /تجاوز\s+القواعد/i,
];

interface IntentRule {
  intent: FlightDirectorIntent;
  weight: number;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "what_if_simulation",
    weight: 3.4,
    patterns: [
      /\bwhat\s+if\b/i,
      /\bwhat\s+happens\s+if\b/i,
      /\bif\s+we\s+(?:add|install|remove|replace|swap|take\s+off|use)\b/i,
      /\bsimulat/i,
      /ماذا\s+(?:لو|سيحدث)/i,
      /لو\s+(?:أضفنا|ركبنا|شيلنا|بدلنا|حذفنا|استبدلنا)/i,
    ],
  },
  {
    intent: "budget_optimization",
    weight: 3.2,
    patterns: [
      /\bbudget\b/i,
      /\bcheap(?:er|est)?\b/i,
      /\bcost\s+effective\b/i,
      /\bwithin\s+(?:our\s+)?budget\b/i,
      /\bexceeding\s+(?:our\s+)?budget\b/i,
      /\bpass\s+(?:all\s+)?12\b/i,
      /\bfull\s+(?:build|plan|solution|setup)\b/i,
      /\bfix\s+(?:all|everything|the\s+ship)\b/i,
      /\bprepare\s+(?:the\s+|our\s+)?ship\b/i,
      /\boptimi[zs]e\b/i,
      /الميزانية/i,
      /نتخطى\s+الميزانية/i,
      /أرخص/i,
      /كل\s+(?:الـ\s*)?12/i,
      /نجهز\s+المركبة/i,
      /خطة\s+كاملة/i,
    ],
  },
  {
    intent: "readiness_evaluation",
    weight: 3.0,
    patterns: [
      /\bcan\s+we\s+launch\b/i,
      /\blaunch\s+ready\b/i,
      /\bready\s+(?:to|for)\s+launch\b/i,
      /\baudit\b/i,
      /\bevaluat(?:e|ion)\b/i,
      /\bcheck\s+(?:status|all\s+rules|ship)\b/i,
      /\bhow\s+many\s+rules\b/i,
      /نقدر\s+نطلق/i,
      /جاهز[ةه]?\s+للإطلاق/i,
      /تقييم\s+(?:المركبة|الإطلاق)/i,
      /فحص\s+المركبة/i,
    ],
  },
  {
    intent: "failure_diagnosis",
    weight: 3.1,
    patterns: [
      /\bwhy\s+(?:is|are|did|can't|cannot)\b/i,
      /\bfailing\b/i,
      /\bfailures?\b/i,
      /\bblocking\s+launch\b/i,
      /\bproblems?\b/i,
      /\bdiagnos/i,
      /\bwrong\s+with\b/i,
      /\bfix\b/i,
      /المشاكل/i,
      /مانع[ةه]?\s+(?:المركبة|الإطلاق)/i,
      /ليه/i,
      /فشل/i,
      /تشخيص/i,
    ],
  },
  {
    intent: "crew_coordination",
    weight: 3.2,
    patterns: [
      /\bcommunications\s+engineer\b/i,
      /\bpower\s*(?:&|and)\s*thermal\s+engineer\b/i,
      /\bscience\s+engineer\b/i,
      /\bstructure\s*(?:&|and)\s*computing\s+engineer\b/i,
      /\bother\s+players?\b/i,
      /\bteammates?\b/i,
      /\bcrew\b/i,
      /\beveryone\b/i,
      /\bcoordinat/i,
      /\bwho\s+should\b/i,
      /الفريق/i,
      /مهندس\s+(?:الاتصالات|الطاقة|العلوم|الهيكل)/i,
      /توزيع\s+المهام/i,
      /باقي\s+اللاعبين/i,
    ],
  },
  {
    intent: "role_guidance",
    weight: 2.9,
    patterns: [
      /\bmy\s+(?:current\s+)?role\b/i,
      /\bwith\s+my\s+role\b/i,
      /\bwhich\s+(?:components?|parts?|station)\s+should\s+i\b/i,
      /\bwhat\s+should\s+i\s+(?:do|collect|get|grab|install)\b/i,
      /\bholding\b/i,
      /\bmy\s+station\b/i,
      /دوري/i,
      /محطتي/i,
      /أجيب\s+إيه/i,
      /مسموح\s+لي/i,
    ],
  },
  {
    intent: "component_recommendation",
    weight: 2.8,
    patterns: [
      /\bbest\s+next\b/i,
      /\bnext\s+(?:component|part|module|step|item)\b/i,
      /\brecommend/i,
      /\bsuggest/i,
      /\bwhat\s+should\s+we\s+(?:add|install|put)\b/i,
      /\bwhich\s+(?:part|component|module)\b/i,
      /أفضل\s+(?:قطعة|مكون)/i,
      /الخطوة\s+الجاية/i,
      /تنصح\s+بإيه/i,
      /نركب\s+إيه/i,
    ],
  },
  {
    intent: "compare_parts",
    weight: 3.1,
    patterns: [
      /\bcompare\b/i,
      /\bvs\.?\b/i,
      /\bversus\b/i,
      /\bdifference\s+between\b/i,
      /\bbetter\s+(?:than|between)\b/i,
      /قارن/i,
      /الفرق\s+بين/i,
    ],
  },
  {
    intent: "real_space_science",
    weight: 2.7,
    patterns: [
      /\bexplain\s+why\b/i,
      /\bwhy\s+are\s+solar\b/i,
      /\binverse[- ]square\b/i,
      /\bless\s+effective\b/i,
      /\breal[- ]world\b/i,
      /\bnasa\b/i,
      /\bhow\s+does\s+(?:ion|nuclear|rtg|radiation|heat|water\s+wall|deep\s+space)\s+work\b/i,
      /اشرح\s+لماذا/i,
      /لماذا\s+(?:الألواح|الشمس|الطاقة\s+الشمسية|الإشعاع)/i,
      /في\s+الواقع/i,
    ],
  },
  {
    intent: "power_thermal_analysis",
    weight: 2.5,
    patterns: [
      /\bpower\b/i,
      /\bsolar\b/i,
      /\bbatter(?:y|ies)\b/i,
      /\bnuclear\b/i,
      /\bheat\b/i,
      /\bthermal\b/i,
      /\binsulat/i,
      /طاقة/i,
      /كهرباء/i,
      /بطاري/i,
      /حرار/i,
      /شمس/i,
    ],
  },
  {
    intent: "thrust_fuel_analysis",
    weight: 2.5,
    patterns: [
      /\bthrust\b/i,
      /\bengine\b/i,
      /\bfuel\b/i,
      /\bion\b/i,
      /\bmass\b/i,
      /\bweight\b/i,
      /\bnose\s+cone\b/i,
      /دفع/i,
      /محرك/i,
      /وقود/i,
      /وزن/i,
      /كتلة/i,
    ],
  },
  {
    intent: "comms_data_analysis",
    weight: 2.5,
    patterns: [
      /\bcomms?\b/i,
      /\bradio\b/i,
      /\bantenna\b/i,
      /\bdish\b/i,
      /\bsignal\b/i,
      /\brange\b/i,
      /\bdata\s*(?:rate|compress|limit)?\b/i,
      /اتصالات/i,
      /إشارة/i,
      /مدى/i,
      /بيانات/i,
    ],
  },
  {
    intent: "computing_science_analysis",
    weight: 2.5,
    patterns: [
      /\bframe\b/i,
      /\bspace\b/i,
      /\bradiation\b/i,
      /\bshield/i,
      /\bbrain\b/i,
      /\bcomputer\b/i,
      /\bscience\b/i,
      /\binstrument\b/i,
      /\bstar\s+instrument\b/i,
      /هيكل/i,
      /مساحة/i,
      /إشعاع/i,
      /كمبيوتر/i,
      /علوم/i,
    ],
  },
  {
    intent: "mission_briefing",
    weight: 2.3,
    patterns: [
      /\bmission\b/i,
      /\bobjective\b/i,
      /\bdestination\b/i,
      /\bbriefing\b/i,
      /\beuropa\b/i,
      /\btitan\b/i,
      /\bmars\b/i,
      /\bmoon\b/i,
      /\bsun\s+watcher\b/i,
      /\bm0[1-6]\b/i,
      /المهمة/i,
      /الوجهة/i,
    ],
  },
];

const MISSION_KEYWORD_MAP: Array<{ id: string; regex: RegExp }> = [
  { id: "M01", regex: /\b(?:M01|moon|lunar)\b|أبولو|القمر/i },
  { id: "M02", regex: /\b(?:M02|mars)\b|المريخ/i },
  { id: "M03", regex: /\b(?:M03|europa|jupiter)\b|أوروبا|المشتري/i },
  { id: "M04", regex: /\b(?:M04|leo|earth\s+orbit)\b|مدار\s+الأرض/i },
  { id: "M05", regex: /\b(?:M05|sun\s+watcher|parker|corona)\b|الشمس/i },
  { id: "M06", regex: /\b(?:M06|titan|saturn)\b|تيتان|زحل/i },
];

export class FlightDirectorIntentClassifier {
  classify(message: string, languageHint?: SupportedLanguage): IntentClassification {
    const trimmed = message.trim();
    const hasArabic = ARABIC_CHAR_REGEX.test(trimmed);
    const language: SupportedLanguage = hasArabic ? "ar" : (languageHint ?? "en");

    const detectedPartIds = Array.from(
      new Set((trimmed.match(PART_ID_TOKEN_REGEX) ?? []).map((id) => id.toUpperCase())),
    );

    const explicitMissionIds = (trimmed.match(MISSION_ID_TOKEN_REGEX) ?? []).map((m) =>
      m.toUpperCase(),
    );
    const keywordMissionIds = MISSION_KEYWORD_MAP.filter((entry) =>
      entry.regex.test(trimmed),
    ).map((entry) => entry.id);

    const detectedMissionIds = Array.from(
      new Set([...explicitMissionIds, ...keywordMissionIds]),
    ).filter((id) => Boolean(GameCatalog.getMissionById(id)));

    const isAdversarial = INJECTION_PATTERNS.some((rx) => rx.test(trimmed));

    const scored: Array<{ intent: FlightDirectorIntent; score: number }> = [];
    for (const rule of INTENT_RULES) {
      let score = 0;
      for (const rx of rule.patterns) {
        if (rx.test(trimmed)) {
          score += rule.weight;
        }
      }
      if (score > 0) {
        scored.push({ intent: rule.intent, score });
      }
    }

    // Multiple part IDs mentioned without another dominant signal -> boost compare_parts
    if (detectedPartIds.length >= 2) {
      const existing = scored.find((s) => s.intent === "compare_parts");
      if (existing) existing.score += 1.5;
      else scored.push({ intent: "compare_parts", score: 2.6 });
    }

    scored.sort((a, b) => b.score - a.score);

    const primaryIntent: FlightDirectorIntent =
      scored[0]?.intent ?? "general_help";
    const secondaryIntents = scored
      .slice(1, 3)
      .map((s) => s.intent);

    const confidence =
      scored.length === 0
        ? 0.45
        : Math.min(0.98, 0.55 + (scored[0].score / 10) * 0.43);

    return {
      primaryIntent,
      secondaryIntents,
      language,
      detectedPartIds,
      detectedMissionIds,
      isAdversarial,
      confidence: Math.round(confidence * 100) / 100,
    };
  }
}

export const intentClassifier = new FlightDirectorIntentClassifier();
