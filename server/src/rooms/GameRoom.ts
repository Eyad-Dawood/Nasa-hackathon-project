import { Room, Client } from "colyseus";
import type { RoomOptions } from "@colyseus/core";
import { GameState, GamePlayerSchema } from "../models/GameState";

type GameRoomOptions = RoomOptions & { state: GameState };

/**
 * GameRoom
 * ────────
 * Handles the in-game session: objective selection and position sync.
 *
 * LIFECYCLE:
 *   1. Created by LobbyRoom.startGame() with { hostId } option.
 *   2. All clients join from ObjectiveScene (not GameScene directly).
 *   3. Host sends "selectObjective" → server confirms → all clients go to GameScene.
 *   4. During gameplay, clients send "move" every ~50ms → position synced to all.
 *
 * JOIN OPTIONS:
 *   username  string   — display name
 *   role      string   — primary role ("role1"…"role4")
 *   x         number   — spawn world-X in pixels
 *   y         number   — spawn world-Y in pixels
 *   isHost    boolean  — whether this joining client is the host
 *
 * CLIENT → SERVER MESSAGES:
 *   "selectObjective"  { objectiveId: string }   — host only
 *   "move"             { x: number; y: number }   — position update
 */
export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 4;

  onCreate(options: Record<string, unknown>) {
    console.log(`[GameRoom] Created: ${this.roomId}`);

    const state = new GameState();

    // Store the lobby host's sessionId so the room can gate actions to them.
    // hostId is passed by LobbyRoom when creating this room.
    state.hostId = String(options?.hostId ?? "");

    this.setState(state);

    // ── selectObjective ──────────────────────────────────────────────────
    // Only the host may call this.
    // Sets selectedObjectiveId on the state so all clients can react.
    // The full objective data lives in ObjectiveData.ts (client) — the server
    // only stores the id. Expand this when real objective schemas are defined.
    this.onMessage(
      "selectObjective",
      (client: Client, payload: { objectiveId: string }) => {
        if (client.sessionId !== this.state.hostId) {
          client.send("objectiveError", {
            message: "Only the host can select the objective.",
          });
          return;
        }

        const objectiveId = String(payload?.objectiveId ?? "").trim();
        if (!objectiveId) {
          client.send("objectiveError", { message: "Invalid objective id." });
          return;
        }

        console.log(
          `[GameRoom] ${this.roomId} — objective selected: "${objectiveId}" by host ${client.sessionId}`,
        );

        // Setting this on the schema triggers an automatic patch to ALL clients.
        // ObjectiveScene listens for this change and transitions to GameScene.
        this.state.selectedObjectiveId = objectiveId;
      },
    );

    // ── move ─────────────────────────────────────────────────────────────
    // Client reports its current world position.
    // Server trusts client position (anti-cheat to be added later).
    this.onMessage(
      "move",
      (client: Client, payload: { x: number; y: number }) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        player.x = Math.max(0, Math.min(payload.x, 10_000));
        player.y = Math.max(0, Math.min(payload.y, 10_000));
      },
    );
  }

  onJoin(
    client: Client,
    options: {
      username?: string;
      role?: string;
      x?: number;
      y?: number;
      isHost?: boolean;
    },
  ) {
    console.log(
      `[GameRoom] ${this.roomId} — joined: ${client.sessionId} as "${options?.username}" role=${options?.role}`,
    );

    // 🔍 DEBUG: هنطبع كل الخيارات اللي وصلت من الـ Client
    console.log(
      `[🔍 DEBUG GameRoom] onJoin - Full options received:`,
      JSON.stringify(options),
    );
    console.log(
      `[🔍 DEBUG GameRoom] onJoin - Received options.isHost:`,
      options?.isHost,
      `| Type:`,
      typeof options?.isHost,
    );

    const player = new GamePlayerSchema();
    player.id = client.sessionId;
    player.username = String(options?.username ?? "Player")
      .trim()
      .slice(0, 24);
    player.role = String(options?.role ?? "role1");
    player.x = Number(options?.x ?? 0);
    player.y = Number(options?.y ?? 0);

    this.state.players.set(client.sessionId, player);

    // لو الـ isHost وصل صح للسيرفر بـ true، المفروض السطر ده يشتغل
    if (options?.isHost) {
      this.state.hostId = client.sessionId;
      console.log(
        `[🔍 DEBUG GameRoom] SUCCESS! Host ID updated to NEW sessionId: ${client.sessionId}`,
      );
    } else {
      console.log(
        `[🔍 DEBUG GameRoom] FAILED! options.isHost is not true. It is: ${options?.isHost}`,
      );
    }
  }
  // 🔴 رجعنا دالة onLeave عشان لو الـ Host خرج
  onLeave(client: Client, _code?: number) {
    console.log(`[GameRoom] ${this.roomId} — left: ${client.sessionId}`);
    this.state.players.delete(client.sessionId);

    // If host leaves during objective selection or game, promote next player as host
    if (client.sessionId === this.state.hostId && this.state.players.size > 0) {
      this.state.hostId = [...this.state.players.keys()][0];
      console.log(`[GameRoom] ${this.roomId} — new host: ${this.state.hostId}`);
    }
  }

  onDispose() {
    console.log(`[GameRoom] ${this.roomId} disposed.`);
  }
}
