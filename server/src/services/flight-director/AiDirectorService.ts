import crypto from "crypto";
import type { GameState } from "../../models/GameState";
import { loadAiConfig, maskSecret } from "./config/AiConfig";
import { FlightDirectorAgent } from "./FlightDirectorAgent";
import { flightDirectorContextBuilder } from "./FlightDirectorContextBuilder";
import { intentClassifier } from "./FlightDirectorIntentClassifier";
import { FlightDirectorMemory } from "./FlightDirectorMemory";
import { validateAndSanitizeUserInput } from "./guardrails/FlightDirectorGuardrails";
import { AiProvider, AiProviderError } from "./providers/AiProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { MockAiProvider } from "./providers/MockAiProvider";
import { flightDirectorToolRegistry, ToolRegistry } from "./tools/ToolRegistry";
import type {
  AiProviderConfig,
  AiRequestInput,
  AiStreamCallbacks,
} from "./types/AiTypes";

interface ActiveRequestEntry {
  requestId: string;
  gameRoomId: string;
  sessionId: string;
  controller: AbortController;
  startedAt: number;
}

export class AiDirectorService {
  readonly config: AiProviderConfig;
  readonly geminiKeyConfigured: boolean;
  readonly startupWarning?: string;
  readonly memory: FlightDirectorMemory;
  readonly toolRegistry: ToolRegistry;
  readonly agent: FlightDirectorAgent;

  private readonly provider: AiProvider;
  private readonly activeRequests = new Map<string, ActiveRequestEntry>();
  private readonly rateBuckets = new Map<string, number[]>();

  constructor(options?: {
    configOverrides?: Partial<AiProviderConfig>;
    provider?: AiProvider;
    toolRegistry?: ToolRegistry;
  }) {
    const loaded = loadAiConfig(options?.configOverrides);
    this.config = loaded.config;
    this.geminiKeyConfigured = loaded.geminiKeyConfigured;
    this.startupWarning = loaded.startupWarning;

    this.provider =
      options?.provider ??
      (this.config.provider === "gemini"
        ? new GeminiProvider(this.config.apiKey)
        : new MockAiProvider());

    this.toolRegistry = options?.toolRegistry ?? flightDirectorToolRegistry;
    this.memory = new FlightDirectorMemory(this.config.maxHistoryTurns);
    this.agent = new FlightDirectorAgent({
      config: this.config,
      provider: this.provider,
      toolRegistry: this.toolRegistry,
      contextBuilder: flightDirectorContextBuilder,
      classifier: intentClassifier,
    });
  }

  getStartupSummary(): Record<string, unknown> {
    return {
      provider: this.provider.providerName,
      model: this.config.model,
      geminiKeyConfigured: this.geminiKeyConfigured,
      apiKeyMasked: maskSecret(this.config.apiKey),
      timeoutMs: this.config.timeoutMs,
      maxToolRounds: this.config.maxToolRounds,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      promptVersion: this.config.promptVersion,
      warning: this.startupWarning ?? null,
    };
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  async processRequest(
    roomState: GameState,
    rawInput: Partial<AiRequestInput>,
    callbacks: AiStreamCallbacks,
  ): Promise<void> {
    const requestId =
      typeof rawInput.requestId === "string" && rawInput.requestId.trim()
        ? rawInput.requestId.trim().slice(0, 64)
        : `req_${crypto.randomUUID().slice(0, 8)}`;

    const gameRoomId = String(rawInput.gameRoomId ?? "unknown-room");
    const sessionId = String(rawInput.sessionId ?? "unknown-session");

    const validatedInput = validateAndSanitizeUserInput(rawInput.message);
    if (!validatedInput.ok) {
      callbacks.onError({
        requestId,
        code: "INVALID_REQUEST",
        message: validatedInput.rejectedReason ?? "Invalid request payload.",
      });
      return;
    }

    // Check rate limit per session
    if (!this.checkAndRecordRateLimit(`${gameRoomId}::${sessionId}`)) {
      callbacks.onError({
        requestId,
        code: "RATE_LIMITED",
        message: `Rate limit exceeded (${this.config.rateLimitPerMinute} queries/minute). Please wait a few seconds before asking again.`,
      });
      return;
    }

    // Check global concurrency cap
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      callbacks.onError({
        requestId,
        code: "BUSY",
        message:
          "Flight Director is currently processing maximum concurrent requests. Please retry in a moment.",
      });
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.config.timeoutMs);

    this.activeRequests.set(requestId, {
      requestId,
      gameRoomId,
      sessionId,
      controller,
      startedAt: Date.now(),
    });

    try {
      const gameContext = flightDirectorContextBuilder.buildFromGameState({
        state: roomState,
        gameRoomId,
        requestingSessionId: sessionId,
        localHeldItemId: rawInput.localHeldItemId ?? null,
      });

      const classification = intentClassifier.classify(
        validatedInput.sanitizedMessage,
        rawInput.languageHint,
      );

      const memoryState = this.memory.getState(
        gameRoomId,
        sessionId,
        gameContext.mission?.id ?? null,
      );

      const result = await this.agent.run({
        requestId,
        userMessage: validatedInput.sanitizedMessage,
        gameContext,
        memory: memoryState,
        classification,
        signal: controller.signal,
        onStatus: (ev) => callbacks.onStatus(ev),
        onTextDelta: (delta) => callbacks.onChunk({ requestId, delta }),
      });

      this.memory.appendExchange({
        gameRoomId,
        sessionId,
        missionId: gameContext.mission?.id ?? null,
        userMessage: validatedInput.sanitizedMessage,
        assistantMessage: result.fullText,
        intents: result.metadata.intents,
      });

      callbacks.onDone({
        requestId,
        fullText: result.fullText,
        metadata: result.metadata,
      });
    } catch (err) {
      if (err instanceof AiProviderError) {
        if (err.code === "ABORTED") {
          callbacks.onError({
            requestId,
            code: timedOut ? "TIMEOUT" : "ABORTED",
            message: timedOut
              ? `Flight Director timed out after ${this.config.timeoutMs}ms.`
              : "Flight Director query cancelled.",
          });
          return;
        }

        callbacks.onError({
          requestId,
          code: err.code === "TIMEOUT" ? "TIMEOUT" : "PROVIDER_ERROR",
          message: err.message,
        });
        return;
      }

      if (controller.signal.aborted) {
        callbacks.onError({
          requestId,
          code: timedOut ? "TIMEOUT" : "ABORTED",
          message: timedOut
            ? `Flight Director timed out after ${this.config.timeoutMs}ms.`
            : "Flight Director query cancelled.",
        });
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);
      callbacks.onError({
        requestId,
        code: "PROVIDER_ERROR",
        message: `Unexpected Flight Director error: ${msg}`,
      });
    } finally {
      clearTimeout(timeoutHandle);
      this.activeRequests.delete(requestId);
    }
  }

  cancelRequest(sessionId: string, requestId?: string): number {
    let cancelled = 0;
    for (const entry of this.activeRequests.values()) {
      const matchesSession = entry.sessionId === sessionId;
      const matchesReq = !requestId || entry.requestId === requestId;
      if (matchesSession && matchesReq) {
        entry.controller.abort();
        cancelled += 1;
      }
    }
    return cancelled;
  }

  clearSession(gameRoomId: string, sessionId: string): void {
    this.cancelRequest(sessionId);
    this.memory.clearSession(gameRoomId, sessionId);
  }

  clearRoom(gameRoomId: string): void {
    for (const entry of this.activeRequests.values()) {
      if (entry.gameRoomId === gameRoomId) {
        entry.controller.abort();
      }
    }
    this.memory.clearRoom(gameRoomId);
  }

  private checkAndRecordRateLimit(bucketKey: string): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (this.rateBuckets.get(bucketKey) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.config.rateLimitPerMinute) {
      this.rateBuckets.set(bucketKey, timestamps);
      return false;
    }

    timestamps.push(now);
    this.rateBuckets.set(bucketKey, timestamps);
    return true;
  }
}

export const aiDirectorService = new AiDirectorService();
