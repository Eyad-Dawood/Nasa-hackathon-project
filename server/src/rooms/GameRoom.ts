import { Room, Client } from "colyseus";
import type { RoomOptions } from "@colyseus/core";
import { GameState, GamePlayerSchema } from "../models/GameState";

type GameRoomOptions = RoomOptions & { state: GameState };

/**
 * GameRoom
 * ────────
 * Handles position synchronisation for all in-game players.
 *
 * JOIN OPTIONS (sent by client):
 *   username  string   — display name
 *   role      string   — primary role ("role1" … "role4")
 *   x         number   — spawn world-X in pixels
 *   y         number   — spawn world-Y in pixels
 *
 * CLIENT → SERVER MESSAGES:
 *   "move"  { x: number; y: number }   — client's current position
 *
 * SERVER → CLIENT (via schema sync, automatic):
 *   state.players  MapSchema<GamePlayerSchema>   — all player positions
 */
export class GameRoom extends Room<GameRoomOptions> {
  maxClients = 4;

  onCreate(_options: Record<string, unknown>) {
    console.log(`[GameRoom] Created: ${this.roomId}`);
    this.setState(new GameState());

    /**
     * "move" – client reports its current world position.
     * Server trusts client position for now (anti-cheat to be added later).
     * Rate: client sends every 50 ms → ~20 updates/sec per player.
     */
    this.onMessage("move", (client: Client, payload: { x: number; y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Basic sanity clamp to prevent wildly out-of-bounds values
      player.x = Math.max(0, Math.min(payload.x, 10_000));
      player.y = Math.max(0, Math.min(payload.y, 10_000));
    });
  }

  onJoin(
    client: Client,
    options: { username?: string; role?: string; x?: number; y?: number }
  ) {
    console.log(
      `[GameRoom] ${this.roomId} — joined: ${client.sessionId} as "${options?.username}" role=${options?.role}`
    );

    const player = new GamePlayerSchema();
    player.id       = client.sessionId;
    player.username = String(options?.username ?? "Player").trim().slice(0, 24);
    player.role     = String(options?.role ?? "role1");
    player.x        = Number(options?.x ?? 0);
    player.y        = Number(options?.y ?? 0);

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, _code?: number) {
    console.log(`[GameRoom] ${this.roomId} — left: ${client.sessionId}`);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log(`[GameRoom] ${this.roomId} disposed.`);
  }
}
