import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerSchema } from "./PlayerSchema";

/**
 * LobbyState – the full authoritative state of one lobby room.
 * Colyseus automatically syncs this to every connected client.
 */
export class LobbyState extends Schema {
  /** sessionId → PlayerSchema */
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();

  /** sessionId of the room creator (the only one who can start the game) */
  @type("string") hostId: string = "";

  /** Whether the game has been started */
  @type("boolean") gameStarted: boolean = false;
}
