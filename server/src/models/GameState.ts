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
 * ShipItemSchema
 * ──────────────
 * Represents one item that has been loaded onto the spaceship.
 *
 * Key in GameState.shipItems MapSchema = itemId.
 * This means each item type can appear at most once on the ship.
 *
 * To allow duplicates later: change key to a UUID and add a `count` field.
 */
export class ShipItemSchema extends Schema {
  /** Matches GameItem.id in ItemData.ts (client) — the server only stores the id. */
  @type("string") itemId: string  = "";
  /** roleId the item belongs to — used by clients to group items in the ship menu. */
  @type("string") roleId: string  = "";
  /** sessionId of the player who added this item. */
  @type("string") addedBy: string = "";
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
   */
  @type("string") selectedObjectiveId: string = "";

  /**
   * Items currently loaded on the spaceship.
   * Key = itemId. One entry per unique item type.
   *
   * Adding new ship-level data: add a field to ShipItemSchema — no other server
   * file needs to change. Client reads it via onStateChange.
   */
  @type({ map: ShipItemSchema })
  shipItems = new MapSchema<ShipItemSchema>();
}
