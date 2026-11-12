import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

/**
 * GamePlayerSchema
 * ────────────────
 * Authoritative per-player state inside the GameRoom.
 * Synced to all clients every patch cycle (~50ms).
 */
export class GamePlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";

  /** Roles assigned to this player (authoritative list for station/ship auth). */
  @type(["string"]) roles = new ArraySchema<string>();

  /** World X position in pixels. */
  @type("float32") x: number = 0;

  /** World Y position in pixels. */
  @type("float32") y: number = 0;
}

/**
 * ShipItemSchema
 * ──────────────
 * Represents one installed component instance on the spaceship.
 *
 * Key in GameState.shipItems MapSchema = unique instanceId so multiple
 * identical items (e.g. two Solar Panels or Extra Brain Chips) can be
 * installed up to each component's canonical `maxPerShip` limit.
 */
export class ShipItemSchema extends Schema {
  /** Unique installed instance identifier (map key). */
  @type("string") instanceId: string = "";
  /** Canonical component ID in game_data.json ("PT01".."SI20"). */
  @type("string") itemId: string = "";
  /** roleId the item belongs to — derived from canonical catalog. */
  @type("string") roleId: string = "";
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

  /** SessionId of the room host. */
  @type("string") hostId: string = "";

  /**
   * The canonical mission objective chosen by the host ("M01".."M06").
   * Empty string = not yet selected (players remain on ObjectiveScene).
   */
  @type("string") selectedObjectiveId: string = "";

  /**
   * The highest campaign level currently unlocked for this crew (1..6).
   * Level 1 is always unlocked; succeeding at a level unlocks the next level.
   */
  @type("uint8") highestUnlockedLevel: number = 1;

  /**
   * Items currently loaded on the spaceship.
   * Key = unique instanceId. One entry per installed module instance.
   */
  @type({ map: ShipItemSchema })
  shipItems = new MapSchema<ShipItemSchema>();
}
