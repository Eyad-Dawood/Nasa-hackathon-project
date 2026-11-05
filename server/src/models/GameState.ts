import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

/**
 * GamePlayerSchema
 * ────────────────
 * Authoritative per-player state inside the GameRoom.
 * Synced to all clients every patch cycle (~50ms).
 *
 * Future fields to add here:
 *   @type("string") currentItem: string = "";
 *   @type("int32")  health: number = 100;
 *   etc.
 */
export class GamePlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";

  /** First assigned role (primary role for rendering/gameplay). */
  @type(["string"]) roles = new ArraySchema<string>();

  /** World X position in pixels. */
  @type("float32") x: number = 0;

  /** World Y position in pixels. */
  @type("float32") y: number = 0;
}

/**
 * GameState
 * ─────────
 * Top-level state for the GameRoom. Synced to all clients.
 */
export class GameState extends Schema {
  @type({ map: GamePlayerSchema })
  players = new MapSchema<GamePlayerSchema>();

  /** SessionId of the player who created the room (the lobby host). */
  @type("string") hostId: string = "";

  /**
   * The objective chosen by the host.
   * Empty string = not yet selected (players are on the ObjectiveScene).
   * Any non-empty value = objective confirmed, all clients move to GameScene.
   *
   * Store only the id here — full data lives in ObjectiveData.ts on the client.
   * Replace with a richer schema object when real objective data is defined.
   */
  @type("string") selectedObjectiveId: string = "";
}
