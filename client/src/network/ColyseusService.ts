import { Client, Room } from "@colyseus/sdk";

// ─── Backend URL resolution ───────────────────────────────────────────────────
const isLocalhost = window.location.href.includes("localhost");
export const BACKEND_WS_URL = isLocalhost
  ? "ws://localhost:2567"
  : `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${
      window.location.port ? `:${window.location.port}` : ""
    }`;

export const BACKEND_HTTP_URL = BACKEND_WS_URL.replace("ws://", "http://").replace("wss://", "https://");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LobbyMeta {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata?: Record<string, unknown>;
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
 *   ColyseusService.send("setRole", { role: "role1", claim: true })
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

  get room() { return this.currentRoom; }
  get sessionId(): string { return this.currentRoom?.sessionId ?? ""; }

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
