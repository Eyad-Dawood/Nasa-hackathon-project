import type { ConversationMemoryState, ConversationTurn } from "./types/ContextTypes";

export class FlightDirectorMemory {
  private store = new Map<string, ConversationMemoryState>();
  private readonly maxHistoryTurns: number;
  private readonly ttlMs: number;

  constructor(maxHistoryTurns = 8, ttlMs = 1000 * 60 * 60 * 2) {
    this.maxHistoryTurns = Math.max(2, maxHistoryTurns);
    this.ttlMs = ttlMs;
  }

  private makeKey(gameRoomId: string, sessionId: string): string {
    return `${gameRoomId}::${sessionId}`;
  }

  getState(
    gameRoomId: string,
    sessionId: string,
    currentMissionId: string | null,
  ): ConversationMemoryState {
    this.pruneExpired();
    const key = this.makeKey(gameRoomId, sessionId);
    const existing = this.store.get(key);

    if (!existing) {
      const fresh: ConversationMemoryState = {
        key,
        missionId: currentMissionId,
        rollingSummary: "",
        turns: [],
        updatedAt: Date.now(),
      };
      this.store.set(key, fresh);
      return fresh;
    }

    // If the active mission changed (e.g. M01 -> M02), invalidate stale mission-specific turns
    if (
      existing.missionId !== null &&
      currentMissionId !== null &&
      existing.missionId !== currentMissionId
    ) {
      const resetState: ConversationMemoryState = {
        key,
        missionId: currentMissionId,
        rollingSummary: `Active mission changed from ${existing.missionId} to ${currentMissionId}. Prior ship-specific audit context was cleared.`,
        turns: [],
        updatedAt: Date.now(),
      };
      this.store.set(key, resetState);
      return resetState;
    }

    if (existing.missionId === null && currentMissionId !== null) {
      existing.missionId = currentMissionId;
    }

    existing.updatedAt = Date.now();
    return existing;
  }

  appendExchange(params: {
    gameRoomId: string;
    sessionId: string;
    missionId: string | null;
    userMessage: string;
    assistantMessage: string;
    intents?: string[];
  }): ConversationMemoryState {
    const state = this.getState(params.gameRoomId, params.sessionId, params.missionId);
    const nowIso = new Date().toISOString();

    const userTurn: ConversationTurn = {
      role: "user",
      content: params.userMessage.slice(0, 1200),
      timestamp: nowIso,
      intents: params.intents,
      missionId: params.missionId,
    };
    const assistantTurn: ConversationTurn = {
      role: "assistant",
      content: params.assistantMessage.slice(0, 2000),
      timestamp: nowIso,
      intents: params.intents,
      missionId: params.missionId,
    };

    state.turns.push(userTurn, assistantTurn);
    state.updatedAt = Date.now();

    const maxMessages = this.maxHistoryTurns * 2;
    if (state.turns.length > maxMessages) {
      const overflowCount = state.turns.length - maxMessages;
      const evicted = state.turns.splice(0, overflowCount);
      state.rollingSummary = this.compactTurns(state.rollingSummary, evicted);
    }

    return state;
  }

  private compactTurns(existingSummary: string, evicted: ConversationTurn[]): string {
    const snippets: string[] = [];
    for (let i = 0; i < evicted.length; i++) {
      const turn = evicted[i];
      if (turn.role === "user") {
        const cleanQ = turn.content.replace(/\s+/g, " ").trim().slice(0, 110);
        const intentTag = turn.intents?.length ? `[${turn.intents.join(",")}]` : "";
        snippets.push(`Q${intentTag}: "${cleanQ}"`);
      } else {
        const firstLine = turn.content.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
        const cleanA = firstLine.replace(/[*_`#]/g, "").trim().slice(0, 120);
        if (cleanA) snippets.push(`A: "${cleanA}"`);
      }
    }
    const merged = [existingSummary, ...snippets].filter(Boolean).join(" | ");
    return merged.slice(-900);
  }

  clearSession(gameRoomId: string, sessionId: string): void {
    this.store.delete(this.makeKey(gameRoomId, sessionId));
  }

  clearRoom(gameRoomId: string): void {
    const prefix = `${gameRoomId}::`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  getActiveEntryCount(): number {
    return this.store.size;
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - this.ttlMs;
    for (const [key, entry] of this.store.entries()) {
      if (entry.updatedAt < cutoff) {
        this.store.delete(key);
      }
    }
  }
}

