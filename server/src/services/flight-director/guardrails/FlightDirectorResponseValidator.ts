import { GameCatalog, ROLE_LABELS } from "../data/GameCatalog";
import { SPACE_KNOWLEDGE_ARTICLES } from "../knowledge/SpaceKnowledgeBase";
import type { SupportedLanguage } from "../types/AiTypes";
import type { DynamicGameContext } from "../types/ContextTypes";
import { redactPotentialSecrets, stripUnsafeHtml } from "./FlightDirectorGuardrails";

export interface ValidationOutcome {
  verifiedText: string;
  warnings: string[];
  correctionDelta: string;
}

const KNOWN_CATALOG_PART_PREFIX_RX = /\b(?:PT|SC|CM|SI)\d{2,3}\b/g;
const URL_RX = /https?:\/\/[^\s)>\]]+/gi;

const POSITIVE_READY_SENTENCE_RX =
  /\b(?:(?:the\s+)?ship\s+is\s+ready\s+(?:to|for)\s+launch|you\s+can\s+launch\s+(?:now|immediately)|all\s+12\s+(?:rules|checks)\s+(?:pass|passed|are\s+passing)|12\s*\/\s*12\s+rules?\s+passing)\b|المركبة\s+جاهز[ةه]?\s+للإطلاق(?:\s+الآن)?/i;

const NEGATION_OR_HYPOTHETICAL_RX =
  /\b(?:not|isn't|aren't|cannot|can't|won't|never|fail(?:ed|ing)?|before|until|after|would|plan|reach|achieve|pass\s+all|missing|blocked)\b|غير|ليست|ليس|مش|لن|خطة|بعد|قبل|حتى|لو/i;

export class FlightDirectorResponseValidator {
  private readonly allowedUrls: Set<string>;

  constructor() {
    this.allowedUrls = new Set(SPACE_KNOWLEDGE_ARTICLES.map((a) => a.url));
  }

  validate(params: {
    rawText: string;
    gameContext: DynamicGameContext;
    language: SupportedLanguage;
  }): ValidationOutcome {
    const warnings: string[] = [];
    let text = stripUnsafeHtml(redactPotentialSecrets(params.rawText)).trim();

    // 1. Validate component IDs against authoritative GameCatalog
    text = text.replace(KNOWN_CATALOG_PART_PREFIX_RX, (token) => {
      if (GameCatalog.getComponentById(token)) {
        return token;
      }
      warnings.push(`Removed unverified component ID "${token}" not present in game_data.json.`);
      return `[unverified-id:${token}]`;
    });

    // 2. Validate cited URLs strictly against verified NASA Knowledge Base
    text = text.replace(URL_RX, (rawUrl) => {
      const normalized = rawUrl.replace(/[.,;:!?]+$/, "");
      if (this.allowedUrls.has(normalized)) {
        return rawUrl;
      }
      warnings.push(`Removed unverified external URL "${normalized}".`);
      return "[unverified-link-removed]";
    });

    // 3. Enforce deterministic launch-readiness honesty
    let correctionDelta = "";
    const audit = params.gameContext.audit;
    if (audit && !audit.launchReady) {
      const sentences = text.split(/(?<=[.!?\n])\s+/);
      const hasFalseReadyClaim = sentences.some(
        (s) =>
          POSITIVE_READY_SENTENCE_RX.test(s) &&
          !NEGATION_OR_HYPOTHETICAL_RX.test(s),
      );

      if (hasFalseReadyClaim) {
        const msg =
          params.language === "ar"
            ? `\n\n> **تنبيه التدقيق الحتمي:** المركبة غير جاهزة للإطلاق حالياً (${audit.passCount}/12 قاعدة ناجحة؛ القواعد المتبقية: ${audit.failingRuleIds.join(", ") || "اختيار المهمة"}).`
            : `\n\n> **Deterministic Audit Override:** Spacecraft is **NOT launch-ready** (${audit.passCount}/12 checks passing; failing: ${audit.failingRuleIds.join(", ") || "no mission selected"}).`;
        warnings.push("Corrected overstated launch-readiness wording against deterministic audit.");
        text += msg;
        correctionDelta += msg;
      }
    }

    // 4. Note if unmentioned teammate roles own referenced parts
    // Inspect text before audit-override wording so generic rule IDs like "science"
    // in the override note do not mask missing station/role explanations.
    const modelTextBeforeOverrideLower = stripUnsafeHtml(
      redactPotentialSecrets(params.rawText),
    ).toLowerCase();

    const referencedIds = Array.from(
      new Set(text.match(/\b(?:PT|SC|CM|SI)\d{2}\b/g) ?? []),
    );
    const missingAuthLabels = new Set<string>();
    const playerRoles = params.gameContext.requestingPlayer.roles;

    for (const id of referencedIds) {
      const comp = GameCatalog.getComponentById(id);
      if (!comp) continue;
      if (!playerRoles.includes(comp.roleId)) {
        const label = ROLE_LABELS[comp.roleId];
        if (!modelTextBeforeOverrideLower.includes(label.toLowerCase())) {
          missingAuthLabels.add(
            `${label} (${GameCatalog.getStationByRole(comp.roleId)?.quadrant ?? comp.roleId})`,
          );
        }
      }
    }

    if (missingAuthLabels.size > 0 && params.gameContext.crew.length > 0) {
      const note =
        params.language === "ar"
          ? `\n\n*ملاحظة الصلاحيات:* المكونات من الأقسام الأخرى تتطلب وجود لاعب يحمل الدور المناسب: ${[...missingAuthLabels].join("، ")}.`
          : `\n\n*Crew Role Note:* Items outside your assigned role require a crewmate at: ${[...missingAuthLabels].join("; ")}.`;
      text += note;
      correctionDelta += note;
    }

    return {
      verifiedText: text,
      warnings,
      correctionDelta,
    };
  }
}

export const responseValidator = new FlightDirectorResponseValidator();
