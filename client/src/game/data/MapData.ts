/**
 * MapData.ts
 * ──────────
 * PLACEHOLDER DATA — edit this file freely to change the map layout.
 * Zero mechanics code lives here. This file is a pure data module.
 *
 * HOW TO REPLACE:
 *   - Change MAP_GRID rows/columns to redesign the level.
 *   - Change PLAYER_SPAWN_TILE to move the starting position.
 *   - Adjust TILE_SIZE / MAP_SCALE if you switch to a different tileset.
 *   - Add new TILE values and handle them in BootScene._generatePlaceholderTextures()
 *     and in GameScene._buildTilemap().
 */

/** Pixel size of one tile in the source texture (before scaling). */
export const TILE_SIZE = 16;

/**
 * Scale factor applied when rendering tiles.
 * TILE_SIZE * MAP_SCALE = rendered tile size in screen pixels.
 * 16 * 2 = 32px per tile on screen.
 */
export const MAP_SCALE = 2;

/** Rendered tile size in pixels (convenience). */
export const TILE_PX = TILE_SIZE * MAP_SCALE;

/** Tile type constants — use these when reading MAP_GRID. */
export const TILE = {
  GRASS: 0,
  WALL:  1,
  WATER: 2,
} as const;

/** Number of tile columns (width). */
export const MAP_COLS = 20;

/** Number of tile rows (height). */
export const MAP_ROWS = 15;

/**
 * The map grid.
 * Row 0 is the top of the map.
 * Each cell value maps to a TILE constant.
 *
 * Legend: 0=grass, 1=wall, 2=water
 */
export const MAP_GRID: number[][] = [
  //  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
  [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // row 0
  [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 1
  [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 2
  [  1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1 ], // row 3
  [  1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], // row 4
  [  1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1 ], // row 5
  [  1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1 ], // row 6
  [  1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 7
  [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 8
  [  1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1 ], // row 9
  [  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1 ], // row 10
  [  1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1 ], // row 11
  [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 12
  [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // row 13
  [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // row 14
];

/**
 * Player starting tile position.
 * col/row are tile-grid coordinates (not screen pixels).
 * GameScene converts these to world pixels: col * TILE_PX, row * TILE_PX.
 */
export const PLAYER_SPAWN_TILE = { col: 2, row: 2 };
