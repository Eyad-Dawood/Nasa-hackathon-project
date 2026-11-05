/**
 * assets.ts
 * ─────────
 * Single source of truth for every asset URL/key used in the game.
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
 *     1. Set `url` to the real path (e.g. "src/resources/assets/player/Idle.png").
 *     2. Remove that asset's entry from _generatePlaceholderTextures().
 *
 * SPRITESHEETS:
 *   Spritesheets have a non-empty url but are NOT loaded via this.load.image().
 *   They are loaded via this.load.spritesheet() in BootScene.preload().
 *   They are NOT included in REMOTE_ASSETS (which is for plain images only).
 *   Mark them with isSpritesheet: true.
 */

export interface AssetEntry {
  /** The key Phaser uses to identify this asset internally. */
  key: string;
  /**
   * URL to load — empty string means the texture is generated procedurally.
   * Replace with a real path when real assets are available.
   */
  url: string;
  /** True for spritesheets — loaded via load.spritesheet(), not load.image(). */
  isSpritesheet?: true;
  /** Frame width in pixels (required for spritesheets). */
  frameWidth?: number;
  /** Frame height in pixels (required for spritesheets). */
  frameHeight?: number;
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

  // ── Player spritesheets (real pixel-art files) ─────────────────────────
  /**
   * Player idle animation — 64×16 PNG, 4 frames of 16×16.
   * Animations defined in AnimationKeys.ts.
   */
  playerIdle: {
    key: "player_idle",
    url: "assets/player/Idle.png",
    isSpritesheet: true,
    frameWidth: 16,
    frameHeight: 16,
  } as AssetEntry,

  /**
   * Player walk animation — 64×64 PNG, 4 columns × 4 rows of 16×16.
   * Row 0 = down, Row 1 = left, Row 2 = right, Row 3 = up.
   */
  playerWalk: {
    key: "player_walk",
    url: "assets/player/Walk.png",
    isSpritesheet: true,
    frameWidth: 16,
    frameHeight: 16,
  } as AssetEntry,

  // ── World sprites (procedurally generated) ────────────────────────────
  /** NPC sprite — yellow 16×16 procedural. */
  npc: { key: "npc", url: "" } as AssetEntry,

  /**
   * Station sprite — 16×16 crate shape, tinted by role colour at runtime.
   */
  station: { key: "station", url: "" } as AssetEntry,

  /**
   * Spaceship sprite — 32×24 procedural rocket silhouette.
   */
  ship: { key: "ship", url: "" } as AssetEntry,

  /**
   * Item carry indicator — tiny 8×8 glowing dot above the player.
   * Tinted at runtime with the item's role colour.
   */
  itemPlaceholder: { key: "item_placeholder", url: "" } as AssetEntry,
} as const;

/** Plain image assets (non-empty url, not spritesheets) — loaded via load.image(). */
export const REMOTE_ASSETS: AssetEntry[] = Object.values(Assets).filter(
  (a) => a.url !== "" && !a.isSpritesheet,
);

/** Spritesheet assets — loaded via load.spritesheet(). */
export const SPRITESHEET_ASSETS: AssetEntry[] = Object.values(Assets).filter(
  (a) => a.isSpritesheet === true,
);

/** Asset keys for procedurally generated textures (url === ""). */
export const PROCEDURAL_KEYS: string[] = Object.values(Assets)
  .filter((a) => a.url === "")
  .map((a) => a.key);
