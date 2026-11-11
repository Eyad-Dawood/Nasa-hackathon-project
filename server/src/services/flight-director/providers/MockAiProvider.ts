import { GameCatalog, ROLE_LABELS } from "../data/GameCatalog";
import {
  AiProvider,
  AiProviderError,
  ProviderConversationMessage,
  ProviderFunctionCall,
  ProviderTurnInput,
  ProviderTurnOutput,
} from "./AiProvider";

function extractLatestUserText(contents: ProviderConversationMessage[]): string {
  for (let i = contents.length - 1; i >= 0; i--) {
    const msg = contents[i];
    if (msg.role === "user") {
      const textParts = msg.parts
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .filter(Boolean);
      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }
  }
  return "";
}

function collectToolResponsesAfterLastUserText(
  contents: ProviderConversationMessage[],
): Map<string, Record<string, unknown>> {
  const results = new Map<string, Record<string, unknown>>();
  let lastTextUserIdx = 0;

  for (let i = contents.length - 1; i >= 0; i--) {
    const msg = contents[i];
    if (msg.role === "user" && msg.parts.some((p) => typeof p.text === "string")) {
      lastTextUserIdx = i;
      break;
    }
  }

  for (let i = lastTextUserIdx + 1; i < contents.length; i++) {
    const msg = contents[i];
    if (msg.role !== "user") continue;
    for (const part of msg.parts) {
      const fr = part.functionResponse as
        | { name?: string; response?: { output?: Record<string, unknown> } | Record<string, unknown> }
        | undefined;
      if (fr && fr.name && fr.response) {
        const resp = fr.response as Record<string, unknown>;
        const payload =
          typeof resp.output === "object" && resp.output !== null
            ? (resp.output as Record<string, unknown>)
            : resp;
        results.set(fr.name, payload);
      }
    }
  }

  return results;
}

function splitIntoChunks(text: string): string[] {
  const words = text.split(/(?<=\s)/);
  const chunks: string[] = [];
  let buf = "";
  for (const w of words) {
    buf += w;
    if (buf.length >= 22) {
      chunks.push(buf);
      buf = "";
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length > 0 ? chunks : [text];
}

export class MockAiProvider implements AiProvider {
  readonly providerName = "mock" as const;
  private readonly chunkDelayMs: number;

  constructor(chunkDelayMs = 4) {
    this.chunkDelayMs = chunkDelayMs;
  }

  async generateTurn(input: ProviderTurnInput): Promise<ProviderTurnOutput> {
    if (input.signal.aborted) {
      throw new AiProviderError("ABORTED", "Request aborted.");
    }

    const toolResults = collectToolResponsesAfterLastUserText(input.contents);
    const userMessage = extractLatestUserText(input.contents);

    // Round 0: emit genuine tool calls matching the prompt's intent(s) so the real
    // ToolRegistry + deterministic services compute all telemetry & engineering answers.
    if (toolResults.size === 0) {
      const calls = this.planToolCalls(userMessage, input);
      return {
        text: "",
        functionCalls: calls,
        modelParts: calls.map((fc) => ({ functionCall: fc })),
        usage: { promptTokens: 420, outputTokens: 64, totalTokens: 484 },
      };
    }

    // Round 1+: compose clean, bilingual EN/AR grounded response strictly from tool outputs.
    const composed = this.composeGroundedResponse(userMessage, toolResults, input);
    const chunks = splitIntoChunks(composed);

    for (const delta of chunks) {
      if (input.signal.aborted) {
        throw new AiProviderError("ABORTED", "Request aborted during mock streaming.");
      }
      input.onTextDelta(delta);
      if (this.chunkDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.chunkDelayMs));
      }
    }

    return {
      text: composed,
      functionCalls: [],
      modelParts: [{ text: composed }],
      usage: { promptTokens: 680, outputTokens: composed.length, totalTokens: 680 + composed.length },
    };
  }

  private planToolCalls(userMessage: string, input: ProviderTurnInput): ProviderFunctionCall[] {
    const cls = input.classification;
    const gc = input.gameContext;
    const lower = userMessage.toLowerCase();
    const calls: ProviderFunctionCall[] = [];
    const seenNames = new Set<string>();

    const addCall = (name: string, args: Record<string, unknown> = {}) => {
      if (seenNames.has(name)) return;
      seenNames.add(name);
      calls.push({ id: `mock_${name}_${calls.length + 1}`, name, args });
    };

    if (cls.detectedPartIds.length > 0) {
      if (cls.primaryIntent === "compare_parts" && cls.detectedPartIds.length >= 2) {
        addCall("compare_components", { componentIds: cls.detectedPartIds.slice(0, 5) });
      } else {
        addCall("get_component_details", { componentIds: cls.detectedPartIds.slice(0, 10) });
      }
    }

    const intents = [cls.primaryIntent, ...cls.secondaryIntents];

    if (intents.includes("what_if_simulation")) {
      const wantsRemove = /\b(?:remove|take\s+off|delete|drop)\b|حذف|إزالة|نقلل|نشيل/i.test(lower);
      let partIds = [...cls.detectedPartIds];

      if (partIds.length === 0) {
        if (lower.includes("ion") || lower.includes("أيون")) partIds = ["PT23"];
        else if (lower.includes("rocket")) partIds = ["PT21"];
        else if (lower.includes("solar") || lower.includes("شمس")) partIds = ["PT03"];
        else if (lower.includes("nuclear") || lower.includes("نووي")) partIds = ["PT06"];
        else if (lower.includes("water wall")) partIds = ["SC08"];
        else if (lower.includes("battery") || lower.includes("بطاري")) partIds = ["PT09"];
        else partIds = ["PT23"];
      }

      addCall(
        "simulate_ship_changes",
        wantsRemove ? { removeIds: partIds } : { addIds: partIds },
      );
      addCall("run_launch_audit", { includePassingChecks: true });
    }

    if (
      intents.includes("budget_optimization") ||
      (intents.includes("mission_briefing") && /prepare|ready|build|pass/i.test(lower))
    ) {
      const objective = lower.includes("mass") || lower.includes("weight")
        ? "lowest_mass"
        : lower.includes("budget") || lower.includes("cheap") || lower.includes("الميزانية")
          ? "lowest_cost"
          : "balanced";
      addCall("find_feasible_build_plan", { objective });
      addCall("run_launch_audit", { includePassingChecks: true });
    }

    if (intents.includes("crew_coordination")) {
      addCall("get_team_coordination_plan", {});
      addCall("get_ship_status", {});
    }

    if (intents.includes("role_guidance")) {
      addCall("get_player_role_guidance", {});
      addCall("run_launch_audit", { includePassingChecks: false });
    }

    if (intents.includes("component_recommendation")) {
      addCall("recommend_next_components", { maxSuggestions: 4 });
      addCall("run_launch_audit", { includePassingChecks: false });
    }

    if (
      intents.includes("readiness_evaluation") ||
      intents.includes("failure_diagnosis") ||
      intents.includes("power_thermal_analysis") ||
      intents.includes("thrust_fuel_analysis") ||
      intents.includes("comms_data_analysis") ||
      intents.includes("computing_science_analysis")
    ) {
      addCall("run_launch_audit", { includePassingChecks: true });
      if (gc.mission && (!gc.audit || !gc.audit.launchReady)) {
        addCall("recommend_next_components", { maxSuggestions: 3 });
      }
    }

    if (
      intents.includes("real_space_science") ||
      /explain|why|لماذا|اشرح|solar|radiation|europa|titan|ion|battery/i.test(lower)
    ) {
      addCall("search_space_knowledge", { query: userMessage, limit: 2 });
    }

    if (intents.includes("mission_briefing") || cls.detectedMissionIds.length > 0) {
      const missionId = cls.detectedMissionIds[0] ?? gc.mission?.id;
      addCall("get_mission_details", missionId ? { missionId } : {});
    }

    if (calls.length === 0) {
      addCall("get_ship_status", {});
      addCall("run_launch_audit", { includePassingChecks: true });
    }

    return calls.slice(0, 4);
  }

  private composeGroundedResponse(
    _userMessage: string,
    toolResults: Map<string, Record<string, unknown>>,
    input: ProviderTurnInput,
  ): string {
    const lang = input.classification.language;
    const cls = input.classification;
    const gc = input.gameContext;
    const sections: string[] = [];

    if (cls.isAdversarial) {
      sections.push(
        lang === "ar"
          ? "### تنبيه بروتوكول مركز التحكم (MCC-HOUSTON)\nلا يمكن تجاوز قواعد الإطلاق الـ 12 الحتمية أو كشف إعدادات النظام. تم فحص حالة المركبة الفعلية عبر أدوات القياس المعتمدة:"
          : "### MCC Protocol Notice\nI cannot override the deterministic 12-rule launch validation, fabricate readiness, or expose internal system details. Here is the verified engineering telemetry:",
      );
    }

    // 1. Unknown component lookup note if player asked about bogus IDs
    const detailsRes = toolResults.get("get_component_details") as
      | {
          found?: Array<Record<string, unknown>>;
          notFoundIds?: string[];
        }
      | undefined;

    if (detailsRes) {
      if (detailsRes.notFoundIds && detailsRes.notFoundIds.length > 0) {
        sections.push(
          lang === "ar"
            ? `- **تنبيه:** الرمز \`${detailsRes.notFoundIds.join("`, `")}\` غير موجود في كتالوج \`game_data.json\` (المكونات الصحيحة هي \`PT01–PT24\`, \`SC01–SC20\`, \`CM01–CM20\`, \`SI01–SI20\`).`
            : `- **Catalog Notice:** \`${detailsRes.notFoundIds.join("`, `")}\` does not exist in \`game_data.json\` (valid components span \`PT01–PT24\`, \`SC01–SC20\`, \`CM01–CM20\`, \`SI01–SI20\`).`,
        );
      }
      if (detailsRes.found && detailsRes.found.length > 0 && cls.primaryIntent !== "what_if_simulation") {
        const lines = detailsRes.found.map((c) =>
          lang === "ar"
            ? `- **${c.name}** (\`${c.id}\`) — القسم: \`${c.roleLabel}\` (${c.stationQuadrant}) | التكلفة: **${c.cost} cr** | الكتلة: **${c.mass} kg** | الحجم: ${c.size} | الحد الأقصى: ${c.maxPerShip ?? "غير محدود"} | الميزة: ${c.good}`
            : `- **${c.name}** (\`${c.id}\`) — Dept: **${c.roleLabel}** at ${c.stationQuadrant} | Cost: **${c.cost} cr** | Mass: **${c.mass} kg** | Size: ${c.size} | Max/Ship: ${c.maxPerShip ?? "Unlimited"} | Strength: ${c.good}`,
        );
        sections.push((lang === "ar" ? "### مواصفات المكونات\n" : "### Component Specifications\n") + lines.join("\n"));
      }
    }

    // 2. Compare components
    const compareRes = toolResults.get("compare_components") as
      | {
          comparisons?: Array<Record<string, unknown>>;
          notFoundIds?: string[];
          sunlightPct?: number;
        }
      | undefined;
    if (compareRes) {
      if (compareRes.notFoundIds && compareRes.notFoundIds.length > 0) {
        sections.push(
          lang === "ar"
            ? `- **تنبيه:** الرمز \`${compareRes.notFoundIds.join("`, `")}\` غير موجود في كتالوج \`game_data.json\`.`
            : `- **Catalog Notice:** \`${compareRes.notFoundIds.join("`, `")}\` does not exist in \`game_data.json\` (valid components span \`PT01–PT24\`, \`SC01–SC20\`, \`CM01–CM20\`, \`SI01–SI20\`).`,
        );
      }
      if (compareRes.comparisons && compareRes.comparisons.length > 0) {
        const lines = compareRes.comparisons.map((c) => {
          const pwrText =
            c.effectivePowerMadeInMission !== undefined
              ? `Power Made: **${c.effectivePowerMadeInMission}** (at ${compareRes.sunlightPct ?? 100}% sun)`
              : c.powerUse
                ? `Power Use: ${c.powerUse}`
                : "";
          const propText = c.thrust ? `Thrust: **${c.thrust}**, Fuel Burn: ${c.fuelBurn ?? 0}` : "";
          return `- \`${c.id}\` **${c.name}** (${c.roleId}): **${c.cost} cr**, **${c.mass} kg**, Size ${c.size}${pwrText ? ` · ${pwrText}` : ""}${propText ? ` · ${propText}` : ""}`;
        });
        sections.push((lang === "ar" ? "### مقارنة المكونات\n" : "### Component Comparison\n") + lines.join("\n"));
      }
    }

    // 3. What-if simulation
    const simRes = toolResults.get("simulate_ship_changes") as
      | {
          ok?: boolean;
          beforePassCount?: number;
          afterPassCount?: number;
          afterLaunchReady?: boolean;
          newlyPassingRules?: string[];
          newlyFailingRules?: string[];
          stillFailingRules?: string[];
          deltas?: { cost: number; mass: number; spaceUsed: number; powerNet: number; science: number };
          afterTotals?: { cost: number; budget: number; mass: number; usedSpace: number; availableSpace: number };
          rejectedAdds?: Array<{ itemId: string; reason: string }>;
          rejectedRemoves?: Array<{ itemId: string; reason: string }>;
          simulatedAdds?: Array<{ id: string; name: string }>;
        }
      | undefined;

    if (simRes?.ok) {
      const addLabel = (simRes.simulatedAdds ?? []).map((a) => `\`${a.id}\` (${a.name})`).join(", ");
      const d = simRes.deltas!;
      const t = simRes.afterTotals!;
      if (lang === "ar") {
        let s = `### نتيجة المحاكاة الافتراضية (${addLabel || "تعديل"})\n`;
        s += `- القواعد الناجحة: **${simRes.beforePassCount}/12 ← ${simRes.afterPassCount}/12** (${simRes.afterLaunchReady ? "تصبح جاهزة للإطلاق" : `متبقي: ${(simRes.stillFailingRules ?? []).join(", ")}`})\n`;
        s += `- التغيّر: التكلفة **${d.cost >= 0 ? "+" : ""}${d.cost} cr** (${t.cost}/${t.budget} cr) | الكتلة **${d.mass >= 0 ? "+" : ""}${d.mass} kg** (${t.mass} kg) | صافي الطاقة **${d.powerNet >= 0 ? "+" : ""}${d.powerNet}** | المساحة ${t.usedSpace}/${t.availableSpace}\n`;
        if ((simRes.newlyFailingRules ?? []).length > 0) {
          s += `- **تحذير — قواعد قد تفشل بعد التعديل:** ${(simRes.newlyFailingRules ?? []).join(", ")}\n`;
        }
        sections.push(s);
      } else {
        let s = `### What-If Simulation Result (${addLabel || "Manifest Mutation"})\n`;
        s += `- Rules Passing: **${simRes.beforePassCount}/12 -> ${simRes.afterPassCount}/12** (${simRes.afterLaunchReady ? "Becomes Launch-Ready" : `Still failing: ${(simRes.stillFailingRules ?? []).join(", ")}`})\n`;
        s += `- Deltas: Cost **${d.cost >= 0 ? "+" : ""}${d.cost} cr** (Total ${t.cost}/${t.budget} cr) | Mass **${d.mass >= 0 ? "+" : ""}${d.mass} kg** (${t.mass} kg) | Net Power **${d.powerNet >= 0 ? "+" : ""}${d.powerNet}** | Space ${t.usedSpace}/${t.availableSpace}\n`;
        if ((simRes.newlyPassingRules ?? []).length > 0) {
          s += `- Newly Passing: **${simRes.newlyPassingRules!.join(", ")}**\n`;
        }
        if ((simRes.newlyFailingRules ?? []).length > 0) {
          s += `- **Regression Warning (Newly Failing):** ${simRes.newlyFailingRules!.join(", ")}\n`;
        }
        if ((simRes.rejectedAdds ?? []).length > 0) {
          s += `- Rejected Additions: ${simRes.rejectedAdds!.map((r) => `${r.itemId} (${r.reason})`).join("; ")}\n`;
        }
        sections.push(s);
      }
    }

    // 4. Deterministic Audit Verdict
    const auditRes = toolResults.get("run_launch_audit") as
      | {
          missionId: string | null;
          missionName: string;
          destination: string;
          launchReady: boolean;
          passCount: number;
          failingRuleIds: string[];
          metrics: {
            totalCost: number;
            totalMass: number;
            usedSpace: number;
            availableSpace: number;
            effectivePowerMade: number;
            netPowerNeeded: number;
            totalSciencePoints: number;
          };
          checks: Array<{
            ruleId: string;
            label: string;
            pass: boolean;
            actualText: string;
            requiredText: string;
            note?: string;
          }>;
        }
      | undefined;

    if (auditRes && cls.primaryIntent !== "real_space_science") {
      if (!auditRes.missionId) {
        sections.push(
          lang === "ar"
            ? "### تقييم الإطلاق\n- لا توجد مهمة مختارة بعد. يجب على المضيف (Host) اختيار مهمة من \`M01\` إلى \`M06\` أولاً."
            : "### Launch Readiness Audit\n- **0/12 checks active:** No mission objective is selected yet. Have the host pick `M01`–`M06` before installing mission-specific hardware.",
        );
      } else {
        const failed = auditRes.checks.filter((c) => !c.pass);
        if (lang === "ar") {
          let s = `### حالة تدقيق الإطلاق (${auditRes.missionId} — ${auditRes.destination})\n`;
          s += auditRes.launchReady
            ? `- **الحالة: جاهزة للإطلاق (12/12 قاعدة ناجحة)** | التكلفة: **${auditRes.metrics.totalCost}/${gc.mission?.budget ?? "—"} cr** | الكتلة: **${auditRes.metrics.totalMass} kg**\n`
            : `- **الحالة: غير جاهزة للإطلاق (${auditRes.passCount}/12 قاعدة ناجحة)** | التكلفة: **${auditRes.metrics.totalCost}/${gc.mission?.budget ?? "—"} cr** | الكتلة: **${auditRes.metrics.totalMass} kg**\n`;
          if (failed.length > 0) {
            s += `**القواعد المانعة للإطلاق حالياً (${failed.length}):**\n`;
            s += failed
              .slice(0, 6)
              .map((f) => `- **${f.label}:** الحالي \`${f.actualText}\` (المطلوب: \`${f.requiredText}\`)${f.note ? ` — ${f.note}` : ""}`)
              .join("\n");
          }
          sections.push(s);
        } else {
          let s = `### Deterministic Launch Audit (${auditRes.missionId} — ${auditRes.destination})\n`;
          s += auditRes.launchReady
            ? `- **Verdict: READY FOR LAUNCH (12/12 rules passing)** | Cost: **${auditRes.metrics.totalCost}/${gc.mission?.budget ?? "—"} cr** | Mass: **${auditRes.metrics.totalMass} kg**\n`
            : `- **Verdict: NOT launch-ready (${auditRes.passCount}/12 rules passing)** | Cost: **${auditRes.metrics.totalCost}/${gc.mission?.budget ?? "—"} cr** | Mass: **${auditRes.metrics.totalMass} kg**\n`;
          if (failed.length > 0) {
            s += `**Failing Checks (${failed.length}):**\n`;
            s += failed
              .slice(0, 7)
              .map((f) => `- **${f.label}:** ${f.actualText} (need ${f.requiredText})${f.note ? ` — ${f.note}` : ""}`)
              .join("\n");
          }
          sections.push(s);
        }
      }
    }

    // 5. Optimizer Full Build / Budget Plan
    const planRes = toolResults.get("find_feasible_build_plan") as
      | {
          ok?: boolean;
          currentLaunchReady?: boolean;
          recommendedPlan?: {
            planName: string;
            feasible: boolean;
            tradeOffSummary: string;
            finalPassCount: number;
            finalCost: number;
            budget: number;
            finalMass: number;
            steps: Array<{
              action: "add" | "remove";
              componentId: string;
              componentName: string;
              quantity: number;
              roleId: string;
              roleLabel: string;
              stationQuadrant: string;
              unitCost: number;
              reason: string;
            }>;
          };
          alternativePlan?: {
            planName: string;
            tradeOffSummary: string;
          } | null;
        }
      | undefined;

    if (planRes?.ok && planRes.recommendedPlan && !planRes.currentLaunchReady) {
      const p = planRes.recommendedPlan;
      if (p.steps.length > 0) {
        const header =
          lang === "ar"
            ? `### خطة البناء المعتمدة للوصول إلى 12/12 (${p.finalCost}/${p.budget} cr، ${p.finalMass} kg)`
            : `### Verified 12/12 Build Plan — ${p.planName} (${p.finalCost}/${p.budget} cr, ${p.finalMass} kg)`;
        const stepLines = p.steps.slice(0, 12).map((s) =>
          lang === "ar"
            ? `- **${s.action === "remove" ? "إزالة" : "تركيب"} ${s.quantity}× \`${s.componentId}\` ${s.componentName}** (${s.unitCost * s.quantity} cr) — قسم **${s.roleLabel}** (${s.stationQuadrant}): ${s.reason}`
            : `- **${s.action === "remove" ? "Remove" : "Install"} ${s.quantity}x \`${s.componentId}\` ${s.componentName}** (${s.unitCost * s.quantity} cr) — **${s.roleLabel}** (${s.stationQuadrant}): ${s.reason}`,
        );
        const altLine = planRes.alternativePlan
          ? lang === "ar"
            ? `\n*خيار بديل:* ${planRes.alternativePlan.planName} — ${planRes.alternativePlan.tradeOffSummary}`
            : `\n*Alternative Architecture:* ${planRes.alternativePlan.planName} — ${planRes.alternativePlan.tradeOffSummary}`
          : "";
        sections.push(`${header}\n${stepLines.join("\n")}${altLine}`);
      }
    }

    // 6. Next-Component Suggestions
    const recRes = toolResults.get("recommend_next_components") as
      | {
          ok?: boolean;
          launchReady?: boolean;
          suggestions?: Array<{
            componentId: string;
            componentName: string;
            action: string;
            quantity: number;
            roleId: string;
            roleLabel: string;
            stationQuadrant: string;
            cost: number;
            mass: number;
            reason: string;
            authorizedForRequestingPlayer: boolean;
            isRoleUnassignedInCrew: boolean;
          }>;
        }
      | undefined;

    if (recRes?.ok && !planRes && recRes.suggestions && recRes.suggestions.length > 0) {
      const lines = recRes.suggestions.map((s) => {
        const authNote = s.authorizedForRequestingPlayer
          ? lang === "ar"
            ? "✅ دورك يسمح لك بجمعه"
            : "✅ Your role can grab this"
          : s.isRoleUnassignedInCrew
            ? lang === "ar"
              ? `⚠ دور ${s.roleLabel} غير موزع في الفريق`
              : `⚠ Role unassigned (${s.roleLabel})`
            : lang === "ar"
              ? `👥 اطلب من مهندس ${s.roleLabel}`
              : `👥 Coordinate with ${s.roleLabel} teammate`;
        return lang === "ar"
          ? `- **${s.action === "remove" ? "إزالة" : "إحضار"} \`${s.componentId}\` ${s.componentName}** (${s.cost} cr, ${s.mass} kg) من **${s.stationQuadrant}** — ${s.reason} (${authNote})`
          : `- **${s.action === "remove" ? "Remove" : "Install"} \`${s.componentId}\` ${s.componentName}** (${s.cost} cr, ${s.mass} kg) at **${s.stationQuadrant}** — ${s.reason} (${authNote})`;
      });
      sections.push(
        (lang === "ar" ? "### أولويات الخطوات القادمة\n" : "### Recommended Next Steps\n") +
          lines.join("\n"),
      );
    }

    // 7. Player Role Guidance
    const roleRes = toolResults.get("get_player_role_guidance") as
      | {
          ok?: boolean;
          actionsForPlayer?: Array<{
            action: string;
            componentId: string;
            componentName: string;
            quantity: number;
            stationQuadrant: string;
            cost: number;
            reason: string;
          }>;
          heldItemEvaluation?: {
            itemId: string;
            name: string;
            authorized: boolean;
            overMaxPerShip: boolean;
            matchesRecommendedPlan: boolean;
          } | null;
        }
      | undefined;

    if (roleRes?.ok) {
      const myActions = roleRes.actionsForPlayer ?? [];
      const header =
        lang === "ar"
          ? `### مهامك حسب دورك الحالي (${gc.requestingPlayer.roles.map((r) => ROLE_LABELS[r]).join(", ") || "بدون دور"})`
          : `### Your Role Action Checklist (${gc.requestingPlayer.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No Role"})`;
      let body = "";
      if (roleRes.heldItemEvaluation) {
        const h = roleRes.heldItemEvaluation;
        body += lang === "ar"
          ? `- **القطعة التي تحملها الآن:** \`${h.itemId}\` ${h.name} (${h.overMaxPerShip ? "تجاوز الحد الأقصى" : h.matchesRecommendedPlan ? "مطلوبة في الخطة" : "يمكن تركيبها بالضغط على E عند المركبة"})\n`
          : `- **Currently Held Item:** \`${h.itemId}\` ${h.name} (${h.overMaxPerShip ? "already at maxPerShip limit" : h.matchesRecommendedPlan ? "needed in build plan — walk to ship and press E" : "compatible with your role"})\n`;
      }
      if (myActions.length > 0) {
        body += myActions
          .slice(0, 6)
          .map((a) =>
            lang === "ar"
              ? `- توجه إلى **${a.stationQuadrant}**: أحضر \`${a.componentId}\` **${a.componentName}** (${a.cost} cr) ×${a.quantity} — ${a.reason}`
              : `- Go to **${a.stationQuadrant}**: collect ${a.quantity}x \`${a.componentId}\` **${a.componentName}** (${a.cost} cr) — ${a.reason}`,
          )
          .join("\n");
      } else {
        body += lang === "ar"
          ? "- لا توجد قطع إضافية مطلوبة من قسمك حالياً وفق خطة الإطلاق."
          : "- No additional parts required from your station right now for the launch plan.";
      }
      sections.push(`${header}\n${body}`);
    }

    // 8. Team Coordination Plan
    const teamRes = toolResults.get("get_team_coordination_plan") as
      | {
          ok?: boolean;
          roleBreakdown?: Array<{
            roleLabel: string;
            stationQuadrant: string;
            assignedCrewMembers: string[];
            isUnassigned: boolean;
            tasks: Array<{
              action: string;
              componentId: string;
              componentName: string;
              quantity: number;
              cost: number;
            }>;
          }>;
          unassignedRolesWarning?: string | null;
        }
      | undefined;

    if (teamRes?.ok && teamRes.roleBreakdown) {
      const lines = teamRes.roleBreakdown.map((rb) => {
        const who = rb.assignedCrewMembers.length > 0 ? rb.assignedCrewMembers.join(", ") : "UNASSIGNED";
        const taskList =
          rb.tasks.length > 0
            ? rb.tasks.map((t) => `${t.action} ${t.quantity}x \`${t.componentId}\` ${t.componentName}`).join(", ")
            : "Standby / check complete";
        return `- **${rb.roleLabel}** [${who}] (${rb.stationQuadrant}): ${taskList}`;
      });
      if (teamRes.unassignedRolesWarning) {
        lines.push(`- **Alert:** ${teamRes.unassignedRolesWarning}`);
      }
      sections.push(
        (lang === "ar" ? "### خطة تنسيق الفريق\n" : "### Crew Department Coordination Plan\n") +
          lines.join("\n"),
      );
    }

    // 9. Mission Briefing
    const missionRes = toolResults.get("get_mission_details") as
      | {
          ok?: boolean;
          mission?: {
            id: string;
            name: string;
            destination: string;
            distanceKm: string;
            sunlightPct: number;
            nightNeed: number;
            heatDanger: number;
            radiation: number;
            launchPull: number;
            signalNeed: number;
            navigationBrain: number;
            scienceGoal: number;
            budget: number;
            starInstrumentId: string;
            starInstrument: string;
            funFact: string;
          };
        }
      | undefined;
    if (missionRes?.ok && missionRes.mission) {
      const m = missionRes.mission;
      sections.push(
        lang === "ar"
          ? `### ملخص المهمة: ${m.id} — ${m.name} (${m.destination})\n- الميزانية: **${m.budget} cr** | هدف العلوم: **${m.scienceGoal}** | ضوء الشمس: **${m.sunlightPct}%** | الحرارة: **${m.heatDanger}** | الإشعاع: **${m.radiation}** | مدى الإشارة: **${m.signalNeed}** | النجم العلمي (+10): \`${m.starInstrumentId}\` (${m.starInstrument})`
          : `### Mission Briefing: ${m.id} — ${m.name} (${m.destination})\n- Budget: **${m.budget} cr** | Science Goal: **${m.scienceGoal} pts** | Sunlight: **${m.sunlightPct}%** (Night Need: ${m.nightNeed}) | Heat: **${m.heatDanger}** | Radiation: **${m.radiation}** | Signal: **${m.signalNeed}** | Star Instrument (+10): \`${m.starInstrumentId}\` (${m.starInstrument})`,
      );
    }

    // 10. Space Knowledge / NASA Science Explanation
    const ragRes = toolResults.get("search_space_knowledge") as
      | {
          articles?: Array<{
            title: string;
            organization: string;
            url: string;
            summary: string;
            facts: string[];
            ageFriendlyAnalogy: string;
            gameConnection: string;
          }>;
        }
      | undefined;

    if (ragRes?.articles && ragRes.articles.length > 0) {
      const top = ragRes.articles[0];
      if (lang === "ar") {
        sections.push(
          `### التفسير العلمي (NASA / JPL): ${top.title}\n` +
            `- **الخلاصة العلمية:** ${top.summary} كلما ابتعدت المركبة عن الشمس يتوزع الضوء على مساحة أوسع (قانون التربيع العكسي)، فتهبط كفاءة الألواح الشمسية بشكل حاد (10% عند أوروبا و1% عند تيتان، مقابل 300% قرب الشمس).\n` +
            `- **الربط بقواعد اللعبة:** ${top.gameConnection}\n` +
            `- **المصدر الرسمي:** [${top.organization} — ${top.title}](${top.url})`,
        );
      } else {
        sections.push(
          `### Space Science Briefing: ${top.title}\n` +
            `- ${top.summary}\n` +
            `- **Key Fact:** ${top.facts[0] ?? top.summary}\n` +
            `- **How It Works Here:** ${top.ageFriendlyAnalogy}\n` +
            `- **In Space Benders:** ${top.gameConnection}\n` +
            `- **NASA Source:** [${top.organization} — ${top.title}](${top.url})`,
        );
      }
    }

    // 11. Ship Status fallback summary
    const statusRes = toolResults.get("get_ship_status") as
      | {
          installedUnitCount?: number;
          installedSummary?: Array<{ id: string; name: string; count: number; totalCost: number }>;
        }
      | undefined;
    if (sections.length === 0 && statusRes) {
      sections.push(
        lang === "ar"
          ? `### حالة المركبة الحالية\n- عدد القطع المركبة: **${statusRes.installedUnitCount ?? 0}**. استخدم أزرار التشخيص السريع لتقييم القواعد الـ 12 أو الحصول على خطة ميزانية كاملة.`
          : `### Spacecraft Telemetry Summary\n- Installed Units: **${statusRes.installedUnitCount ?? 0}** (${(statusRes.installedSummary ?? []).map((x) => `${x.count}x ${x.id}`).join(", ") || "none"}). Ask me about launch readiness, power, next components, crew coordination, or NASA space science!`,
      );
    }

    // Verification footer if GameCatalog lookup showed station help wasn't stated yet
    if (sections.length === 0) {
      return lang === "ar"
        ? "مركز التحكم متصل. اسألني عن جاهزية الإطلاق أو أعطال الطاقة أو خطة الميزانية أو أي مكون في المركبة."
        : "MCC telemetry link active. Ask about launch readiness, subsystem failures, what-if changes, budget plans, or crew station tasks.";
    }

    return sections.join("\n\n");
  }
}
