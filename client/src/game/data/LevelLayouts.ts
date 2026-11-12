import { TILE, MAP_COLS, MAP_ROWS, TILE_PX } from "./MapData";
import { StationDefinition } from "./StationData";

/**
 * LevelLayouts.ts
 * ───────────────
 * Master Architectural Blueprint Registry for Campaign Levels (1 through 6).
 *
 * Each level features a completely distinct architectural room blueprint:
 *   - Level 1: LEO Orbital Cleanroom & Gantry (Open, high-tech, observation deck)
 *   - Level 2: Lunar Crater Base Alpha (Dual-dome regolith habitat with airlock)
 *   - Level 3: Ares Mars Bio-Dome (Octagonal habitat with sandstorm deflectors)
 *   - Level 4: Europa Cryo-Subterranean Vault (3-tier insulated ice corridors)
 *   - Level 5: Helios Solar Blast Fortress (Heavy tungsten radiation baffles)
 *   - Level 6: Titan Hydrocarbon Outpost (Industrial methane canal twin wings)
 */

export interface LevelPalette {
  floorTint: number;
  wallTint: number;
  accentColor: string;
  conduitColor: number;
  particleColor: number;
  atmosphereColor: string;
  ambientDescription: string;
}

export interface LevelLayout {
  level: number;
  name: string;
  codename: string;
  sectorTag: string;
  grid: number[][];
  spawnTile: { col: number; row: number };
  npcTile: { col: number; row: number };
  shipTile: { col: number; row: number };
  shipWorldPos: { x: number; y: number };
  stations: StationDefinition[];
  palette: LevelPalette;
}

// ── Helper to build clean perimeter wall grid ───────────────────────────
function createBaseGrid(): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
        row.push(TILE.WALL);
      } else {
        row.push(TILE.GRASS);
      }
    }
    grid.push(row);
  }
  return grid;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 1: LEO ORBITAL CLEANROOM & OBSERVATION GANTRY
// ═════════════════════════════════════════════════════════════════════════
function buildLevel1Grid(): number[][] {
  const g = createBaseGrid();
  // Symmetrical equipment bays
  g[3][5] = TILE.WALL; g[3][6] = TILE.WALL;
  g[3][13] = TILE.WALL; g[3][14] = TILE.WALL;
  g[11][5] = TILE.WALL; g[11][6] = TILE.WALL;
  g[11][13] = TILE.WALL; g[11][14] = TILE.WALL;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 2: LUNAR BASE ALPHA (DUAL-DOME WITH AIRLOCK TRANSIT)
// ═════════════════════════════════════════════════════════════════════════
function buildLevel2Grid(): number[][] {
  const g = createBaseGrid();
  // Vertical airlock dividing wall at col 9
  g[1][9] = TILE.WALL;
  g[2][9] = TILE.WALL;
  g[3][9] = TILE.WALL;
  g[4][9] = TILE.WALL;
  // rows 5, 6, 7, 8, 9 are open airlock transit hallway
  g[10][9] = TILE.WALL;
  g[11][9] = TILE.WALL;
  g[12][9] = TILE.WALL;
  g[13][9] = TILE.WALL;

  // Secondary airlock pylon at col 11
  g[3][11] = TILE.WALL;
  g[4][11] = TILE.WALL;
  g[10][11] = TILE.WALL;
  g[11][11] = TILE.WALL;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 3: ARES MARS BIO-DOME (OCTAGONAL SANDSTORM SHELTER)
// ═════════════════════════════════════════════════════════════════════════
function buildLevel3Grid(): number[][] {
  const g = createBaseGrid();
  // Octagonal diagonal corners
  g[1][1] = TILE.WALL; g[1][2] = TILE.WALL; g[2][1] = TILE.WALL;
  g[1][18] = TILE.WALL; g[1][17] = TILE.WALL; g[2][18] = TILE.WALL;
  g[13][1] = TILE.WALL; g[13][2] = TILE.WALL; g[12][1] = TILE.WALL;
  g[13][18] = TILE.WALL; g[13][17] = TILE.WALL; g[12][18] = TILE.WALL;

  // Deflection baffles
  g[3][7] = TILE.WALL; g[3][8] = TILE.WALL;
  g[3][11] = TILE.WALL; g[3][12] = TILE.WALL;
  g[11][7] = TILE.WALL; g[11][8] = TILE.WALL;
  g[11][11] = TILE.WALL; g[11][12] = TILE.WALL;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 4: EUROPA CRYO-SUBTERRANEAN VAULT (3-TIER ICE CORRIDORS)
// ═════════════════════════════════════════════════════════════════════════
function buildLevel4Grid(): number[][] {
  const g = createBaseGrid();
  // Upper thermal barrier wall across row 4 with pass-throughs
  for (let c = 2; c <= 7; c++) g[4][c] = TILE.WALL;
  for (let c = 12; c <= 17; c++) g[4][c] = TILE.WALL;

  // Lower geothermal containment wall across row 10
  for (let c = 2; c <= 7; c++) g[10][c] = TILE.WALL;
  for (let c = 12; c <= 17; c++) g[10][c] = TILE.WALL;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 5: HELIOS SOLAR OBSERVATORY (HEAVY RADIATION BLAST BAFFLES)
// ═════════════════════════════════════════════════════════════════════════
function buildLevel5Grid(): number[][] {
  const g = createBaseGrid();
  // Tungsten zig-zag radiation baffles flanking assembly core
  g[2][6] = TILE.WALL; g[3][6] = TILE.WALL; g[4][6] = TILE.WALL;
  g[2][13] = TILE.WALL; g[3][13] = TILE.WALL; g[4][13] = TILE.WALL;
  g[10][6] = TILE.WALL; g[11][6] = TILE.WALL; g[12][6] = TILE.WALL;
  g[10][13] = TILE.WALL; g[11][13] = TILE.WALL; g[12][13] = TILE.WALL;

  // Blast shielding deflector blocks
  g[7][3] = TILE.WALL;
  g[7][16] = TILE.WALL;
  return g;
}

// ═════════════════════════════════════════════════════════════════════════
// LEVEL 6: TITAN HYDROCARBON OUTPOST (INDUSTRIAL TWIN WINGS)
// ═════════════════════════════════════════════════════════════════════════
function buildLevel6Grid(): number[][] {
  const g = createBaseGrid();
  // Industrial methane canal pylons
  g[3][6] = TILE.WALL; g[4][6] = TILE.WALL; g[5][6] = TILE.WALL;
  g[9][6] = TILE.WALL; g[10][6] = TILE.WALL; g[11][6] = TILE.WALL;

  g[3][13] = TILE.WALL; g[4][13] = TILE.WALL; g[5][13] = TILE.WALL;
  g[9][13] = TILE.WALL; g[10][13] = TILE.WALL; g[11][13] = TILE.WALL;

  // Central gantry safety bollards
  g[3][10] = TILE.WALL;
  g[11][10] = TILE.WALL;
  return g;
}

// ── Master Layout Definitions ───────────────────────────────────────────

export const LEVEL_LAYOUTS: Record<number, LevelLayout> = {
  1: {
    level: 1,
    name: "LEO Orbital Gantry",
    codename: "EARTH_WATCHER_CLEANROOM",
    sectorTag: "SECTOR 01 // LEO ORBITAL CLEANROOM",
    grid: buildLevel1Grid(),
    spawnTile: { col: 2, row: 4 },
    npcTile: { col: 6, row: 4 },
    shipTile: { col: 10, row: 7 },
    shipWorldPos: { x: 10 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 2, tileRow: 2 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 17, tileRow: 2 },
      { id: "station_r3", roleId: "Communications", tileCol: 2, tileRow: 12 },
      { id: "station_r4", roleId: "Science", tileCol: 17, tileRow: 12 },
    ],
    palette: {
      floorTint: 0xe0f2fe, // Crisp Cleanroom Cyan
      wallTint: 0x93c5fd,
      accentColor: "#38BDF8",
      conduitColor: 0x38bdf8,
      particleColor: 0xbae6fd,
      atmosphereColor: "rgba(56, 189, 248, 0.08)",
      ambientDescription: "Pressurized Low-Earth Orbit Cleanroom • 100% Sunlight Nominal",
    },
  },

  2: {
    level: 2,
    name: "Lunar Crater Base Alpha",
    codename: "LUNAR_REGOLITH_AIRLOCK",
    sectorTag: "SECTOR 02 // LUNAR BASE ALPHA - PRESSURE AIRLOCK",
    grid: buildLevel2Grid(),
    spawnTile: { col: 2, row: 7 },
    npcTile: { col: 9, row: 7 },
    shipTile: { col: 14, row: 7 },
    shipWorldPos: { x: 14 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 3, tileRow: 3 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 3, tileRow: 11 },
      { id: "station_r3", roleId: "Communications", tileCol: 17, tileRow: 2 },
      { id: "station_r4", roleId: "Science", tileCol: 17, tileRow: 12 },
    ],
    palette: {
      floorTint: 0xf1f5f9, // Lunar Slate Concrete
      wallTint: 0x64748b,
      accentColor: "#CBD5E1",
      conduitColor: 0x94a3b8,
      particleColor: 0xe2e8f0,
      atmosphereColor: "rgba(203, 213, 225, 0.06)",
      ambientDescription: "Sub-surface Regolith Vault • Low Gravity Dust Settlement",
    },
  },

  3: {
    level: 3,
    name: "Ares Mars Bio-Dome",
    codename: "MARTIAN_OCTAGONAL_HAB",
    sectorTag: "SECTOR 03 // ARES BASE - REINFORCED HABITAT DOME",
    grid: buildLevel3Grid(),
    spawnTile: { col: 3, row: 7 },
    npcTile: { col: 10, row: 3 },
    shipTile: { col: 10, row: 7 },
    shipWorldPos: { x: 10 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 4, tileRow: 4 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 15, tileRow: 4 },
      { id: "station_r3", roleId: "Communications", tileCol: 4, tileRow: 10 },
      { id: "station_r4", roleId: "Science", tileCol: 15, tileRow: 10 },
    ],
    palette: {
      floorTint: 0xffedd5, // Martian Iron Rust
      wallTint: 0xf87171,
      accentColor: "#EF4444",
      conduitColor: 0xef4444,
      particleColor: 0xfca5a5,
      atmosphereColor: "rgba(239, 68, 68, 0.08)",
      ambientDescription: "Pressurized Habitat Dome • Atmospheric Sandstorm Deflection Active",
    },
  },

  4: {
    level: 4,
    name: "Europa Cryo-Subterranean Vault",
    codename: "EUROPA_SUB_ICE_VAULT",
    sectorTag: "SECTOR 04 // EUROPA SUB-ICE CRYOGENIC VAULT",
    grid: buildLevel4Grid(),
    spawnTile: { col: 10, row: 2 },
    npcTile: { col: 6, row: 7 },
    shipTile: { col: 10, row: 7 },
    shipWorldPos: { x: 10 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 4, tileRow: 2 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 15, tileRow: 2 },
      { id: "station_r3", roleId: "Communications", tileCol: 4, tileRow: 12 },
      { id: "station_r4", roleId: "Science", tileCol: 15, tileRow: 12 },
    ],
    palette: {
      floorTint: 0xcffafe, // Glacial Cryo Ice Cyan
      wallTint: 0x38bdf8,
      accentColor: "#0284C7",
      conduitColor: 0x0284c7,
      particleColor: 0x7dd3fc,
      atmosphereColor: "rgba(2, 132, 199, 0.1)",
      ambientDescription: "Deep Ice Trench • Extreme Solar Attenuation (10% Solar Power)",
    },
  },

  5: {
    level: 5,
    name: "Helios Solar Blast Fortress",
    codename: "HELIOS_CORONA_OBSERVATORY",
    sectorTag: "SECTOR 05 // HELIOS SOLAR OBSERVATORY - HEAT SHIELD SECTOR",
    grid: buildLevel5Grid(),
    spawnTile: { col: 2, row: 7 },
    npcTile: { col: 10, row: 2 },
    shipTile: { col: 10, row: 7 },
    shipWorldPos: { x: 10 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 2, tileRow: 4 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 17, tileRow: 4 },
      { id: "station_r3", roleId: "Communications", tileCol: 2, tileRow: 10 },
      { id: "station_r4", roleId: "Science", tileCol: 17, tileRow: 10 },
    ],
    palette: {
      floorTint: 0xfef3c7, // Solar Amber Gold
      wallTint: 0xfbbf24,
      accentColor: "#F59E0B",
      conduitColor: 0xf59e0b,
      particleColor: 0xfde68a,
      atmosphereColor: "rgba(245, 158, 11, 0.12)",
      ambientDescription: "Heavy Tungsten Blast Baffles • Extreme Radiation Danger Zone",
    },
  },

  6: {
    level: 6,
    name: "Titan Hydrocarbon Outpost",
    codename: "TITAN_SATURN_EXPEDITION",
    sectorTag: "SECTOR 06 // TITAN HYDROCARBON BASE - SATURN EXPEDITION",
    grid: buildLevel6Grid(),
    spawnTile: { col: 10, row: 12 },
    npcTile: { col: 10, row: 2 },
    shipTile: { col: 10, row: 7 },
    shipWorldPos: { x: 10 * TILE_PX + TILE_PX / 2, y: 7 * TILE_PX + TILE_PX / 2 },
    stations: [
      { id: "station_r1", roleId: "powerAndThermal", tileCol: 3, tileRow: 3 },
      { id: "station_r2", roleId: "structureAndComputing", tileCol: 16, tileRow: 3 },
      { id: "station_r3", roleId: "Communications", tileCol: 3, tileRow: 11 },
      { id: "station_r4", roleId: "Science", tileCol: 16, tileRow: 11 },
    ],
    palette: {
      floorTint: 0xd1fae5, // Methane Emerald Slate
      wallTint: 0x34d399,
      accentColor: "#10B981",
      conduitColor: 0x10b981,
      particleColor: 0x6ee7b7,
      atmosphereColor: "rgba(16, 185, 129, 0.1)",
      ambientDescription: "Liquid Hydrocarbon Basin • Deep-Space Long-Range Array",
    },
  },
};

/**
 * Returns the complete architectural layout, tile grid, spawn, and palette for a given level (1..6).
 */
export function getLevelLayout(level: number = 1): LevelLayout {
  const bounded = Math.max(1, Math.min(level, 6));
  return LEVEL_LAYOUTS[bounded] ?? LEVEL_LAYOUTS[1];
}
