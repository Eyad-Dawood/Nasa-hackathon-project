import { Client, Room } from "@colyseus/sdk";

// ─── Backend URL resolution ───────────────────────────────────────────────────
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const envWsUrl = (import.meta as unknown as { env?: Record<string, string | undefined> })
  .env?.VITE_BACKEND_WS_URL;
export const BACKEND_WS_URL = envWsUrl?.trim()
  ? envWsUrl.trim()
  : isLocalhost
    ? "ws://localhost:2567"
    : `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${
        window.location.port ? `:${window.location.port}` : ""
      }`;

export const BACKEND_HTTP_URL = BACKEND_WS_URL.replace(
  "ws://",
  "http://",
).replace("wss://", "https://");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LobbyMeta {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata?: Record<string, unknown>;
}

export interface ClientAiStatusEvent {
  requestId: string;
  phase:
    | "analyzing"
    | "gathering_telemetry"
    | "running_tools"
    | "optimizing"
    | "retrieving_knowledge"
    | "verifying"
    | "streaming";
  label: string;
  toolName?: string;
}

export interface ClientAiChunkEvent {
  requestId: string;
  delta: string;
}

export interface ClientAiRecommendation {
  componentId: string;
  componentName: string;
  action: "add" | "remove" | "replace";
  quantity: number;
  roleId: string;
  roleLabel: string;
  stationQuadrant: string;
  cost: number;
  mass: number;
  reason: string;
}

export interface ClientAiCitation {
  title: string;
  organization: string;
  url: string;
}

export interface ClientAiDoneEvent {
  requestId: string;
  fullText: string;
  metadata: {
    requestId: string;
    provider: string;
    model: string;
    language: "en" | "ar";
    intents: string[];
    toolsCalled: string[];
    toolCallCount: number;
    launchReady: boolean | null;
    passCount: number | null;
    totalRules: number;
    missionId: string | null;
    recommendations: ClientAiRecommendation[];
    citations: ClientAiCitation[];
    warnings: string[];
    latencyMs: number;
    tokenUsage?: {
      promptTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  };
}

export interface ClientAiErrorEvent {
  requestId: string;
  code:
    | "RATE_LIMITED"
    | "BUSY"
    | "INVALID_REQUEST"
    | "TIMEOUT"
    | "PROVIDER_ERROR"
    | "ABORTED";
  message: string;
}

type MessageHandler = (data: unknown) => void;

// ─── ColyseusService (Singleton) ─────────────────────────────────────────────

/**
 * ColyseusService
 * ───────────────
 * Thin wrapper around the Colyseus JS SDK.
 *
 * Usage:
 *   await ColyseusService.createLobby(username)
 *   await ColyseusService.joinLobby(roomId, username)
 *   ColyseusService.send("setRole", { role: "powerAndThermal", claim: true })
 *   ColyseusService.on("game-started", handler)
 *   await ColyseusService.getLobbies()
 */
class _ColyseusService {
  private client: Client;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private currentRoom: Room<any> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();

  constructor() {
    this.client = new Client(BACKEND_WS_URL);
  }

  // ── Room lifecycle ────────────────────────────────────────────────────

  async createLobby(username: string): Promise<void> {
    this._leaveCurrentRoom();
    this.currentRoom = await this.client.create("lobby", { username });
    this._attachRoomListeners();
  }

  async joinLobby(roomId: string, username: string): Promise<void> {
    this._leaveCurrentRoom();
    this.currentRoom = await this.client.joinById(roomId, { username });
    this._attachRoomListeners();
  }

  /**
   * Join a GameRoom by its roomId (received in the "game-started" event).
   * Passes the player's starting position so the server can initialise them.
   */
  async joinGame(
    gameRoomId: string,
    username: string,
    roles: string[], // 🔴 نستقبل المصفوفة
    spawnX: number,
    spawnY: number,
    isHost: boolean = false,
  ): Promise<void> {
    this._leaveCurrentRoom();

    this.currentRoom = await this.client.joinById(gameRoomId, {
      username,
      roles, // 🔴 نبعت المصفوفة كلها للسيرفر
      x: spawnX,
      y: spawnY,
      isHost,
    });
    this._attachRoomListeners();
  }

  /** Host selects the canonical mission objective ("M01".."M06"). */
  selectObjective(objectiveId: string): void {
    this.send("selectObjective", { objectiveId });
  }

  /** Host advances to the next mission objective ("M01".."M06"). */
  sendNextMission(objectiveId: string, resetShip = false): void {
    this.send("nextMission", { objectiveId, resetShip });
  }

  /** Send the local player's current world position to the GameRoom. */
  sendMove(x: number, y: number): void {
    this.send("move", { x, y });
  }

  /** Tell the server to add an item to the ship inventory. */
  sendAddItem(itemId: string, roleId: string): void {
    this.send("addItemToShip", { itemId, roleId });
  }

  /** Tell the server to remove an item instance from the ship inventory. */
  sendRemoveItem(instanceId: string, itemId?: string): void {
    this.send("removeItemFromShip", { instanceId, itemId });
  }

  /** Ask the server AI Flight Director (streams private responses back via ai:* events). */
  sendAiAsk(payload: {
    requestId: string;
    message: string;
    localHeldItemId?: string | null;
    languageHint?: "en" | "ar";
  }): void {
    this.send("ai:ask", payload);
  }

  /** Cancel an in-flight AI Flight Director request on the server. */
  sendAiCancel(requestId?: string): void {
    this.send("ai:cancel", requestId ? { requestId } : {});
  }

  leaveRoom(): void {
    this._leaveCurrentRoom();
  }

  // ── Sending messages ──────────────────────────────────────────────────

  send(type: string, payload?: unknown): void {
    if (!this.currentRoom) {
      console.warn(`[ColyseusService] Cannot send "${type}" – not in a room.`);
      return;
    }
    this.currentRoom.send(type, payload);
  }

  // ── Lobby list (HTTP matchmaking endpoint) ────────────────────────────

  async getLobbies(): Promise<LobbyMeta[]> {
    try {
      const res = await fetch(`${BACKEND_HTTP_URL}/rooms`);
      if (!res.ok) return [];
      const data: Array<{
        roomId: string;
        name: string;
        clients: number;
        maxClients: number;
        locked?: boolean;
        metadata?: Record<string, unknown>;
      }> = await res.json();
      // Filter out full/locked rooms
      return data
        .filter((r) => !r.locked)
        .map((r) => ({
          roomId: r.roomId,
          clients: r.clients,
          maxClients: r.maxClients,
          metadata: r.metadata,
        }));
    } catch (e) {
      console.warn("[ColyseusService] getLobbies failed:", e);
      return [];
    }
  }

  // ── Event handling ────────────────────────────────────────────────────

  /** Subscribe to a server message type. Returns an unsubscribe function. */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => this.messageHandlers.get(type)?.delete(handler);
  }

  // ── Accessors ─────────────────────────────────────────────────────────

  get room() {
    return this.currentRoom;
  }
  get sessionId(): string {
    return this.currentRoom?.sessionId ?? "";
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _leaveCurrentRoom(): void {
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
    }
    this.messageHandlers.clear();
  }

  private _attachRoomListeners(): void {
    if (!this.currentRoom) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.currentRoom.onMessage("*", (type: any, message: unknown) => {
      const handlers = this.messageHandlers.get(type as string);
      if (handlers) {
        handlers.forEach((h) => h(message));
      }
    });

    this.currentRoom.onLeave(() => {
      this.currentRoom = null;
    });
  }
}

export const ColyseusService = new _ColyseusService();
