/**
 * NpcData.ts
 * ──────────
 * PLACEHOLDER DATA — edit this file to change NPCs, positions, and dialogue.
 * Zero mechanics code lives here. This file is a pure data module.
 *
 * HOW TO ADD A NEW NPC:
 *   Add a new object to NPC_LIST with a unique id, tile position, and dialogue lines.
 *   NpcController will pick it up automatically — no other file needs changing.
 *
 * HOW TO ADD MORE DATA TO AN NPC (e.g. quest flags, shop inventory):
 *   Extend the NpcDefinition interface and add the new field to your NPC entry.
 *   NpcController receives the full definition object, so you can read it there.
 */

/** Full definition of a single NPC. All data, no methods. */
export interface NpcDefinition {
  /** Unique identifier — used as a key in systems. */
  id: string;

  /** Display name shown in the dialogue box header. */
  name: string;

  /** Tile-grid column (not screen pixels). */
  tileCol: number;

  /** Tile-grid row (not screen pixels). */
  tileRow: number;

  /**
   * Dialogue lines shown in order.
   * Each press of E advances one line; last line closes the dialogue.
   */
  dialogue: string[];

  // ── Future fields (examples — uncomment when needed) ──────────────────
  // questId?: string;
  // shopInventory?: string[];
  // isHostile?: boolean;
}

/**
 * All NPCs in the game.
 * Edit freely — NpcController reads this list directly.
 */
export const NPC_LIST: NpcDefinition[] = [
  {
    id: "npc_guard",
    name: "Beebo",
    tileCol: 5,
    tileRow: 4,
    dialogue: [
      "Greetings, Operator. Artemis Assembly Bay is active.",
      "Fetch your subsystem modules from the 4 research stations.",
      "Install all required hardware onto the rocket to authorize flight.",
      "Telemetry systems nominal. Standing by for launch directive.",
    ],
  },
];
