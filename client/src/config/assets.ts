/**
 * assets.ts
 * ─────────
 * Single source of truth for every asset URL used in the game.
 *
 * HOW TO USE:
 *   import { Assets } from "../config/assets";
 *   this.load.image(Assets.playerSprite.key, Assets.playerSprite.url);
 *
 * HOW TO ADD A NEW ASSET:
 *   1. Add a new entry in the `Assets` object below.
 *   2. Any scene or component that needs it imports from this file.
 *   3. No other file should contain a hard-coded asset URL.
 */

interface AssetEntry {
  /** The key Phaser uses to identify this asset internally. */
  key: string;
  /** URL to load – replace placeholder URLs with real paths later. */
  url: string;
}

export const Assets = {
  // ── Sprites ──────────────────────────────────────────────────────────
  playerSprite: {
    key: "player_sprite",
    url: "https://via.placeholder.com/32x32.png?text=P",
  } as AssetEntry,

  // ── Tilesets ─────────────────────────────────────────────────────────
  tileset: {
    key: "tileset",
    url: "https://via.placeholder.com/256x256.png?text=Tileset",
  } as AssetEntry,

  // ── UI / Icons ───────────────────────────────────────────────────────
  role1Icon: {
    key: "role1_icon",
    url: "https://via.placeholder.com/64x64.png?text=R1",
  } as AssetEntry,

  role2Icon: {
    key: "role2_icon",
    url: "https://via.placeholder.com/64x64.png?text=R2",
  } as AssetEntry,

  role3Icon: {
    key: "role3_icon",
    url: "https://via.placeholder.com/64x64.png?text=R3",
  } as AssetEntry,

  role4Icon: {
    key: "role4_icon",
    url: "https://via.placeholder.com/64x64.png?text=R4",
  } as AssetEntry,
} as const;

/** Convenience array of all assets, useful for bulk-preloading in BootScene. */
export const ALL_ASSETS: AssetEntry[] = Object.values(Assets);
