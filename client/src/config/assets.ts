/**
 * assets.ts
 * ─────────
 * Single source of truth for every asset URL/key used in the game.
 *
 * HOW TO USE:
 *   import { Assets } from "../config/assets";
 *   this.load.image(Assets.tileGrass.key, Assets.tileGrass.url);
 *
 * HOW TO ADD A NEW ASSET:
 *   1. Add a new entry in the `Assets` object below.
 *   2. Any scene or system that needs it imports from this file.
 *   3. No other file should contain a hard-coded asset URL or key string.
 *
 * PLACEHOLDER STRATEGY:
 *   Game-world assets (tiles, sprites) have an empty url — their textures are
 *   generated procedurally in BootScene._generatePlaceholderTextures().
 *   When real pixel-art files are ready:
 *     1. Set `url` to the real path (e.g. "/assets/tileset.png").
 *     2. Remove that asset's entry from _generatePlaceholderTextures().
 */

interface AssetEntry {
  /** The key Phaser uses to identify this asset internally. */
  key: string;
  /**
   * URL to load — empty string means the texture is generated procedurally.
   * Replace with a real path when real assets are available.
   */
  url: string;
}

export const Assets = {
  // ── UI / Role Icons ───────────────────────────────────────────────────
  role1Icon: { key: "role1_icon", url: "https://via.placeholder.com/64x64.png?text=R1" } as AssetEntry,
  role2Icon: { key: "role2_icon", url: "https://via.placeholder.com/64x64.png?text=R2" } as AssetEntry,
  role3Icon: { key: "role3_icon", url: "https://via.placeholder.com/64x64.png?text=R3" } as AssetEntry,
  role4Icon: { key: "role4_icon", url: "https://via.placeholder.com/64x64.png?text=R4" } as AssetEntry,

  // ── World tiles (procedurally generated — url is intentionally empty) ──
  tileGrass: { key: "tile_grass", url: "" } as AssetEntry,
  tileWall:  { key: "tile_wall",  url: "" } as AssetEntry,
  tileWater: { key: "tile_water", url: "" } as AssetEntry,

  // ── World sprites (procedurally generated) ────────────────────────────
  /**
   * Player sprite — generated as a white 16×16 square with a black dot.
   * Tinted at runtime with the player's role colour.
   */
  player: { key: "player", url: "" } as AssetEntry,

  /**
   * NPC sprite — yellow 16×16 square with a dark dot.
   */
  npc: { key: "npc", url: "" } as AssetEntry,
} as const;

/** Assets that have a real URL and should be loaded via this.load.image(). */
export const REMOTE_ASSETS: AssetEntry[] = Object.values(Assets).filter((a) => a.url !== "");

/** Asset keys for procedurally generated textures (url === ""). */
export const PROCEDURAL_KEYS: string[] = Object.values(Assets)
  .filter((a) => a.url === "")
  .map((a) => a.key);
