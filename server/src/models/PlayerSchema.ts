import { Schema, type, ArraySchema } from "@colyseus/schema";

/**
 * PlayerSchema – authoritative player data synced to all clients.
 *
 * `roles` is an array because one player may control multiple roles
 * when fewer than 4 players are present (see role-distribution rules).
 *
 * Future fields (inventory, currentItem, etc.) will be added here.
 */
export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";

  /** Roles assigned to this player, e.g. ["powerAndThermal", "Communications"] */
  @type(["string"]) roles = new ArraySchema<string>();

  /** True once the player has finished selecting their role(s). */
  @type("boolean") ready: boolean = false;
}
