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

import { assetUrl } from "./basePath";

/** Helper: wrap a relative asset path so it works under any base path (e.g. GitHub Pages). */
function a(path: string): string {
  return path === "" ? "" : assetUrl(`/${path}`);
}

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
  powerAndThermalIcon: {
    key: "powerAndThermal_icon",
    url: a("assets/icons/Power_And_Thermal_Engineer.png"),
  } as AssetEntry,
  structureAndComputingIcon: {
    key: "structureAndComputing_icon",
    url: a("assets/icons/Structure_And_Computing_Engineer.png"),
  } as AssetEntry,
  CommunicationsIcon: {
    key: "Communications_icon",
    url: a("assets/icons/Communications_Engineer.png"),
  } as AssetEntry,
  ScienceIcon: {
    key: "Science_icon",
    url: a("assets/icons/Science_Engineer.png"),
  } as AssetEntry,
  spaceBendersLogo: {
    key: "space_benders_logo",
    url: a("assets/space_benders_logo.png"),
  } as AssetEntry,

  // ── World tiles (NASA Cleanroom Sci-Fi Assets) ────────────────────────
  tileGrass: {
    key: "tile_floor",
    url: a("assets/space_benders_pixel_assets/floor_tile_32x32.png"),
  } as AssetEntry,
  tileWall: {
    key: "tile_wall",
    url: a("assets/space_benders_pixel_assets/wall_tile_32x32.png"),
  } as AssetEntry,
  tileWater: {
    key: "tile_water",
    url: a("assets/space_benders_pixel_assets/floor_tile_32x32.png"),
  } as AssetEntry,

  // ── Player spritesheets (real pixel-art files) ─────────────────────────
  playerIdle: {
    key: "player_idle",
    url: a("assets/player/Idle.png"),
    isSpritesheet: true,
    frameWidth: 16,
    frameHeight: 16,
  } as AssetEntry,

  playerWalk: {
    key: "player_walk",
    url: a("assets/player/Walk.png"),
    isSpritesheet: true,
    frameWidth: 16,
    frameHeight: 16,
  } as AssetEntry,

  // ── World sprites (Production-ready Space Benders Assets) ─────────────
  npc: {
    key: "npc",
    url: a("assets/space_benders_pixel_assets/mission_control_droid_32x32.png"),
  } as AssetEntry,

  station: {
    key: "station",
    url: a("assets/space_benders_pixel_assets/power_thermal_station_64x64.png"),
  } as AssetEntry,

  stationPower: {
    key: "station_power",
    url: a("assets/space_benders_pixel_assets/power_thermal_station_64x64.png"),
  } as AssetEntry,
  stationStructure: {
    key: "station_structure",
    url: a("assets/space_benders_pixel_assets/structure_computing_station_64x64.png"),
  } as AssetEntry,
  stationCommunications: {
    key: "station_communications",
    url: a("assets/space_benders_pixel_assets/communications_station_64x64.png"),
  } as AssetEntry,
  stationScience: {
    key: "station_science",
    url: a("assets/space_benders_pixel_assets/science_station_64x64.png"),
  } as AssetEntry,

  ship: {
    key: "ship",
    url: a("assets/space_benders_pixel_assets/artemis_assembly_bay_96x160.png"),
  } as AssetEntry,

  interactionBadge: {
    key: "interaction_badge",
    url: a("assets/space_benders_pixel_assets/interaction_badge_E_32x32.png"),
  } as AssetEntry,

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
