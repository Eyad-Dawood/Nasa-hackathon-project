import { TILE_PX } from "./MapData";

/**
 * StationData.ts  —  STATION & SHIP WORLD POSITIONS
 * ────────────────────────────────────────────────────
 * Pure data module. Zero mechanics here.
 * Edit this file to move stations or add new ones.
 *
 * Station role assignment rules:
 *   - Each station serves exactly one roleId.
 *   - A player can access a station only if that roleId is in their roles[].
 *   - Players with multiple roles can access multiple stations.
 */

export interface StationDefinition {
  /** Unique id for this station. */
  id: string;
  /** The role that can access this station. Must match a GameItem.roleId. */
  roleId: string;
  /** Tile-grid column (not pixels). GameScene converts via TILE_PX. */
  tileCol: number;
  /** Tile-grid row (not pixels). */
  tileRow: number;
  /** Label shown above the station sprite and in the station menu header. */
  label: string;
}

/** Four corner stations, one per role. */
export const STATIONS: StationDefinition[] = [
  { id: "station_r1", roleId: "role1", tileCol: 2,  tileRow: 2,  label: "Engineering Bay" },
  { id: "station_r2", roleId: "role2", tileCol: 17, tileRow: 2,  label: "Navigation Bay"  },
  { id: "station_r3", roleId: "role3", tileCol: 2,  tileRow: 12, label: "Structure Bay"   },
  { id: "station_r4", roleId: "role4", tileCol: 17, tileRow: 12, label: "Weapons Bay"      },
];

/** Center of the map — where the spaceship sits. */
export const SHIP_TILE = { col: 10, row: 7 };

/** Convenience: convert a station's tile position to world pixels. */
export function stationWorldPos(def: StationDefinition): { x: number; y: number } {
  return {
    x: def.tileCol * TILE_PX + TILE_PX / 2,
    y: def.tileRow * TILE_PX + TILE_PX / 2,
  };
}

/** Convenience: ship center in world pixels. */
export const SHIP_WORLD_POS = {
  x: SHIP_TILE.col * TILE_PX + TILE_PX / 2,
  y: SHIP_TILE.row * TILE_PX + TILE_PX / 2,
};
