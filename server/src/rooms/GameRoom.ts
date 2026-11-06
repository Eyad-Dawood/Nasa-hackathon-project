import { Room, Client } from "colyseus";
import type { RoomOptions } from "@colyseus/core";
import {
  GameState,
  GamePlayerSchema,
  ShipItemSchema,
} from "../models/GameState";

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
 *   role      string   — primary role ("powerAndThermal"…"Science")
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
    state.selectedObjectiveId = "artemis_lunar_relay";

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

    // ── addItemToShip ────────────────────────────────────────────────────
    // Any player can deliver their carried item to the ship.
    // Key = itemId so each item type appears at most once.
    this.onMessage(
      "addItemToShip",
      (client: Client, payload: { itemId: string; roleId: string }) => {
        const itemId = String(payload?.itemId ?? "").trim();
        const roleId = String(payload?.roleId ?? "").trim();
        if (!itemId || !roleId) return;

        const entry = new ShipItemSchema();
        entry.itemId = itemId;
        entry.roleId = roleId;
        entry.addedBy = client.sessionId;
        this.state.shipItems.set(itemId, entry);

        console.log(
          `[GameRoom] ${this.roomId} — ship +item "${itemId}" by ${client.sessionId}`,
        );
      },
    );

    // ── removeItemFromShip ───────────────────────────────────────────────
    // Any player can pull an item off the ship to carry it back.
    this.onMessage(
      "removeItemFromShip",
      (client: Client, payload: { itemId: string }) => {
        const itemId = String(payload?.itemId ?? "").trim();
        if (!itemId || !this.state.shipItems.has(itemId)) return;

        this.state.shipItems.delete(itemId);
        console.log(
          `[GameRoom] ${this.roomId} — ship -item "${itemId}" by ${client.sessionId}`,
        );
      },
    );
  }

  onJoin(client: Client, options: any) {
    const player = new GamePlayerSchema();
    player.id = client.sessionId;
    player.username = String(options?.username ?? "Player")
      .trim()
      .slice(0, 24);

    // 🔴 إضافة كل الأدوار للمصفوفة في السيرفر
    if (Array.isArray(options?.roles)) {
      player.roles.push(...options.roles);
    }

    player.x = Number(options?.x ?? 0);
    player.y = Number(options?.y ?? 0);

    this.state.players.set(client.sessionId, player);

    if (options && options.isHost === true) {
      this.state.hostId = client.sessionId;
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
