import { GameCatalog } from "./data/GameCatalog";
import { FlightDirectorContextBuilder } from "./FlightDirectorContextBuilder";
import { FlightDirectorIntentClassifier } from "./FlightDirectorIntentClassifier";
import { buildFlightDirectorSystemPrompt } from "./FlightDirectorPrompt";
import { responseValidator } from "./guardrails/FlightDirectorResponseValidator";
import {
  AiProvider,
  AiProviderError,
  ProviderConversationMessage,
} from "./providers/AiProvider";
import { ToolRegistry } from "./tools/ToolRegistry";
import type {
  AiDoneMetadata,
  AiProviderConfig,
  AiStatusEvent,
  IntentClassification,
  RecommendedActionItem,
} from "./types/AiTypes";
import type { ConversationMemoryState, DynamicGameContext } from "./types/ContextTypes";
import type { FlightDirectorToolName } from "./types/ToolTypes";

export interface AgentRunInput {
  requestId: string;
  userMessage: string;
  gameContext: DynamicGameContext;
  memory: ConversationMemoryState;
  classification?: IntentClassification;
  signal: AbortSignal;
  onStatus: (event: AiStatusEvent) => void;
  onTextDelta: (delta: string) => void;
}

export interface AgentRunResult {
  fullText: string;
  metadata: AiDoneMetadata;
}

function stableArgsSignature(toolName: string, args: unknown): string {
  try {
    const obj = typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {};
    const keys = Object.keys(obj).sort();
    const normalized: Record<string, unknown> = {};
    for (const k of keys) normalized[k] = obj[k];
    return `${toolName}::${JSON.stringify(normalized)}`;
  } catch {
    return `${toolName}::{}`;
  }
}

function phaseForTool(name: string): Pick<AiStatusEvent, "phase" | "label"> {
  switch (name) {
    case "find_feasible_build_plan":
    case "recommend_next_components":
      return { phase: "optimizing", label: "Computing verified build plan..." };
    case "search_space_knowledge":
      return { phase: "retrieving_knowledge", label: "Retrieving NASA science data..." };
    case "run_launch_audit":
      return { phase: "running_tools", label: "Running 12-rule launch audit..." };
    case "simulate_ship_changes":
      return { phase: "running_tools", label: "Simulating ship modification..." };
    default:
      return { phase: "running_tools", label: `Executing ${name}...` };
  }
}

export class FlightDirectorAgent {
  private readonly config: AiProviderConfig;
  private readonly provider: AiProvider;
  private readonly toolRegistry: ToolRegistry;
  private readonly contextBuilder: FlightDirectorContextBuilder;
  private readonly classifier: FlightDirectorIntentClassifier;

  constructor(params: {
    config: AiProviderConfig;
    provider: AiProvider;
    toolRegistry: ToolRegistry;
    contextBuilder: FlightDirectorContextBuilder;
    classifier: FlightDirectorIntentClassifier;
  }) {
    this.config = params.config;
    this.provider = params.provider;
    this.toolRegistry = params.toolRegistry;
    this.contextBuilder = params.contextBuilder;
    this.classifier = params.classifier;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const startMs = Date.now();
    const {
      requestId,
      userMessage,
      gameContext,
      memory,
      signal,
      onStatus,
      onTextDelta,
    } = input;

    onStatus({
      requestId,
      phase: "analyzing",
      label: "Analyzing mission directive & telemetry...",
    });

    const classification =
      input.classification ?? this.classifier.classify(userMessage);
    const contextBlock = this.contextBuilder.formatContextBlock(
      gameContext,
      memory.rollingSummary,
    );
    const systemPrompt = buildFlightDirectorSystemPrompt({
      contextBlock,
      classification,
      gameContext,
    });

    const contents: ProviderConversationMessage[] = memory.turns.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    }));
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const toolSchemas = this.toolRegistry.getToolSchemas();
    const executedSignatures = new Map<string, Record<string, unknown>>();
    const toolsCalled: string[] = [];
    const recommendationsMap = new Map<string, RecommendedActionItem>();
    const citationsMap = new Map<string, { title: string; organization: string; url: string }>();

    let latestAuditReady: boolean | null = gameContext.audit?.launchReady ?? null;
    let latestPassCount: number | null = gameContext.audit?.passCount ?? null;
    let accumulatedUsage: AiDoneMetadata["tokenUsage"] | undefined;
    let finalText = "";
    let streamedStarted = false;

    const handleStreamDelta = (delta: string) => {
      if (!streamedStarted) {
        streamedStarted = true;
        onStatus({
          requestId,
          phase: "streaming",
          label: "Transmitting Flight Director briefing...",
        });
      }
      onTextDelta(delta);
    };

    for (let round = 0; round <= this.config.maxToolRounds; round++) {
      if (signal.aborted) {
        throw new AiProviderError("ABORTED", "Request aborted.");
      }

      const allowToolsThisRound = round < this.config.maxToolRounds;
      const turnOutput = await this.provider.generateTurn({
        model: this.config.model,
        systemPrompt,
        contents,
        toolSchemas: allowToolsThisRound ? toolSchemas : [],
        classification,
        gameContext,
        signal,
        onTextDelta: handleStreamDelta,
      });

      if (turnOutput.usage) {
        accumulatedUsage = {
          promptTokens:
            (accumulatedUsage?.promptTokens ?? 0) + (turnOutput.usage.promptTokens ?? 0),
          outputTokens:
            (accumulatedUsage?.outputTokens ?? 0) + (turnOutput.usage.outputTokens ?? 0),
          totalTokens:
            (accumulatedUsage?.totalTokens ?? 0) + (turnOutput.usage.totalTokens ?? 0),
        };
      }

      if (turnOutput.text) {
        finalText += turnOutput.text;
      }

      // If no function calls requested, generation turn completed
      if (turnOutput.functionCalls.length === 0 || !allowToolsThisRound) {
        break;
      }

      // Preserve exact model parts for multi-turn Gemini function-calling continuity
      if (turnOutput.modelParts.length > 0) {
        contents.push({
          role: "model",
          parts: turnOutput.modelParts,
        });
      }

      const responseParts: Array<Record<string, unknown>> = [];

      for (const fc of turnOutput.functionCalls) {
        if (signal.aborted) {
          throw new AiProviderError("ABORTED", "Request aborted during tool execution.");
        }

        const statusInfo = phaseForTool(fc.name);
        onStatus({
          requestId,
          phase: statusInfo.phase,
          label: statusInfo.label,
          toolName: fc.name,
        });

        const sig = stableArgsSignature(fc.name, fc.args);
        let payload: Record<string, unknown>;

        if (executedSignatures.has(sig)) {
          payload = {
            ...executedSignatures.get(sig)!,
            cachedDuplicateNote: "Duplicate tool call returned cached deterministic result.",
          };
        } else {
          const result = await this.toolRegistry.executeTool({
            name: fc.name,
            rawArgs: fc.args,
            context: { gameContext, requestId },
            timeoutMs: this.config.toolTimeoutMs,
          });
          payload = result.payload;
          executedSignatures.set(sig, payload);
          toolsCalled.push(fc.name);
          this.harvestMetadataFromToolResult(
            fc.name as FlightDirectorToolName,
            payload,
            recommendationsMap,
            citationsMap,
            (auditReady, passCount) => {
              latestAuditReady = auditReady;
              latestPassCount = passCount;
            },
          );
        }

        responseParts.push({
          functionResponse: {
            ...(fc.id ? { id: fc.id } : {}),
            name: fc.name,
            response: { output: payload },
          },
        });
      }

      contents.push({
        role: "user",
        parts: responseParts,
      });
    }

    if (!finalText.trim()) {
      const fallbackText =
        classification.language === "ar"
          ? `تم فحص القياسات: حالياً ${latestPassCount ?? gameContext.audit?.passCount ?? 0}/12 قاعدة ناجحة.`
          : `Telemetry check complete: currently passing ${latestPassCount ?? gameContext.audit?.passCount ?? 0}/12 checks.`;
      finalText = fallbackText;
      handleStreamDelta(fallbackText);
    }

    onStatus({
      requestId,
      phase: "verifying",
      label: "Verifying engineering claims & guardrails...",
    });

    const validation = responseValidator.validate({
      rawText: finalText,
      gameContext,
      language: classification.language,
    });

    if (validation.correctionDelta) {
      onTextDelta(validation.correctionDelta);
    }

    const intents = [classification.primaryIntent, ...classification.secondaryIntents];
    const metadata: AiDoneMetadata = {
      requestId,
      provider: this.provider.providerName,
      model: this.config.provider === "mock" ? "mock-flight-director" : this.config.model,
      language: classification.language,
      intents,
      toolsCalled,
      toolCallCount: toolsCalled.length,
      launchReady: latestAuditReady,
      passCount: latestPassCount,
      totalRules: 12,
      missionId: gameContext.mission?.id ?? null,
      recommendations: Array.from(recommendationsMap.values()).slice(0, 8),
      citations: Array.from(citationsMap.values()).slice(0, 4),
      warnings: validation.warnings,
      latencyMs: Date.now() - startMs,
      tokenUsage: accumulatedUsage,
    };

    return {
      fullText: validation.verifiedText,
      metadata,
    };
  }

  private harvestMetadataFromToolResult(
    toolName: FlightDirectorToolName,
    payload: Record<string, unknown>,
    recommendationsMap: Map<string, RecommendedActionItem>,
    citationsMap: Map<string, { title: string; organization: string; url: string }>,
    onAuditUpdate: (ready: boolean | null, passCount: number | null) => void,
  ): void {
    if (toolName === "run_launch_audit" && typeof payload.passCount === "number") {
      onAuditUpdate(
        typeof payload.launchReady === "boolean" ? payload.launchReady : null,
        payload.passCount,
      );
    }

    if (toolName === "find_feasible_build_plan") {
      const plan = payload.recommendedPlan as
        | {
            steps?: Array<{
              action: "add" | "remove";
              componentId: string;
              componentName: string;
              quantity: number;
              roleId: RecommendedActionItem["roleId"];
              roleLabel: string;
              stationQuadrant: string;
              unitCost: number;
              unitMass: number;
              reason: string;
            }>;
          }
        | undefined;
      if (plan?.steps) {
        for (const s of plan.steps) {
          recommendationsMap.set(`${s.action}:${s.componentId}`, {
            componentId: s.componentId,
            componentName: s.componentName,
            action: s.action,
            quantity: s.quantity,
            roleId: s.roleId,
            roleLabel: s.roleLabel,
            stationQuadrant: s.stationQuadrant,
            cost: s.unitCost,
            mass: s.unitMass,
            reason: s.reason,
          });
        }
      }
    }

    if (toolName === "recommend_next_components") {
      const suggestions = payload.suggestions as
        | Array<{
            componentId: string;
            componentName: string;
            action: "add" | "remove" | "replace";
            quantity: number;
            roleId: RecommendedActionItem["roleId"];
            roleLabel: string;
            stationQuadrant: string;
            cost: number;
            mass: number;
            reason: string;
          }>
        | undefined;
      if (suggestions) {
        for (const s of suggestions) {
          recommendationsMap.set(`${s.action}:${s.componentId}`, {
            componentId: s.componentId,
            componentName: s.componentName,
            action: s.action,
            quantity: s.quantity,
            roleId: s.roleId,
            roleLabel: s.roleLabel,
            stationQuadrant: s.stationQuadrant,
            cost: s.cost,
            mass: s.mass,
            reason: s.reason,
          });
        }
      }
    }

    if (toolName === "get_player_role_guidance") {
      const actions = payload.actionsForPlayer as
        | Array<{
            action: "add" | "remove";
            componentId: string;
            componentName: string;
            quantity: number;
            stationQuadrant: string;
            cost: number;
            reason: string;
          }>
        | undefined;
      if (actions) {
        for (const a of actions) {
          const comp = GameCatalog.getComponentById(a.componentId);
          if (!comp) continue;
          recommendationsMap.set(`${a.action}:${a.componentId}`, {
            componentId: a.componentId,
            componentName: a.componentName,
            action: a.action,
            quantity: a.quantity,
            roleId: comp.roleId,
            roleLabel: a.stationQuadrant,
            stationQuadrant: a.stationQuadrant,
            cost: comp.cost,
            mass: comp.mass,
            reason: a.reason,
          });
        }
      }
    }

    if (toolName === "search_space_knowledge") {
      const articles = payload.articles as
        | Array<{ title: string; organization: string; url: string }>
        | undefined;
      if (articles) {
        for (const a of articles) {
          if (a.url) {
            citationsMap.set(a.url, {
              title: a.title,
              organization: a.organization,
              url: a.url,
            });
          }
        }
      }
    }
  }
}

