/**
 * ItemData.ts  —  MASTER ITEM REGISTRY
 * ──────────────────────────────────────
 * Single source of truth for every game item.
 *
 * HOW TO ADD A NEW ITEM:
 *   1. Add an entry to ITEMS below.
 *   2. That's it. StationEntity, StationMenuUI, ShipMenuUI, CarrySystem
 *      all import from here — nothing else needs changing.
 *
 * HOW TO ADD A NEW METADATA FIELD (e.g. "description"):
 *   1. Add the field to the GameItem interface.
 *   2. Fill in values on each ITEMS entry.
 *   3. Any UI that wants to display it imports GameItem and reads the field.
 *      No other system files need editing.
 *
 * WHY THE SERVER ONLY STORES itemId:
 *   The server's ShipItemSchema stores itemId (a string) and roleId.
 *   Full item data is reconstructed client-side via getItemById().
 *   This keeps the schema lean: adding fields here never requires a server deploy.
 */

/** Full definition of a single game item. Zero mechanics code here. */
export interface GameItem {
  /** Unique identifier — stored on the server as ShipItemSchema.itemId. */
  id: string;

  /** Display name shown in menus and carry indicator. */
  name: string;

  /** Mass in kilograms — shown in menus and summed for total ship weight. */
  weight: number;

  /** Which role's station stocks this item. Must match a valid roleId. */
  roleId: string;

  /**
   * Phaser texture key for the small carry indicator above the player sprite.
   * All items share "item_placeholder" until real pixel-art assets are made.
   * To give an item its own sprite:
   *   1. Add a unique key to assets.ts.
   *   2. Generate its texture in BootScene.
   *   3. Set assetKey here.
   */
  assetKey: string;

  // ── Add new metadata below — touch only this interface + ITEMS array ──
  // description?: string;
  // rarity?: "common" | "rare" | "legendary";
  // assemblyTime?: number;  // seconds to install on ship
}

export const ITEMS: GameItem[] = [
  // ── Power And Thermal — Engineering ──────────────────────────────────────────────
  {
    id: "engine_core",
    name: "Engine Core",
    weight: 50,
    roleId: "powerAndThermal",
    assetKey: "item_placeholder",
  },
  {
    id: "fuel_cell",
    name: "Fuel Cell",
    weight: 20,
    roleId: "powerAndThermal",
    assetKey: "item_placeholder",
  },
  {
    id: "thruster",
    name: "Thruster",
    weight: 35,
    roleId: "powerAndThermal",
    assetKey: "item_placeholder",
  },

  // ── Structure And Computing — Navigation ───────────────────────────────────────────────
  {
    id: "nav_system",
    name: "Nav System",
    weight: 15,
    roleId: "structureAndComputing",
    assetKey: "item_placeholder",
  },
  {
    id: "radar_dish",
    name: "Radar Dish",
    weight: 25,
    roleId: "structureAndComputing",
    assetKey: "item_placeholder",
  },
  {
    id: "comms_array",
    name: "Comms Array",
    weight: 10,
    roleId: "structureAndComputing",
    assetKey: "item_placeholder",
  },

  // ── Communications — Structure ────────────────────────────────────────────────
  {
    id: "hull_plate",
    name: "Hull Plate",
    weight: 60,
    roleId: "Communications",
    assetKey: "item_placeholder",
  },
  {
    id: "shield_gen",
    name: "Shield Generator",
    weight: 45,
    roleId: "Communications",
    assetKey: "item_placeholder",
  },
  {
    id: "armor_slab",
    name: "Armor Slab",
    weight: 70,
    roleId: "Communications",
    assetKey: "item_placeholder",
  },

  // ── Science — Weapons ──────────────────────────────────────────────────
  {
    id: "laser_cannon",
    name: "Laser Cannon",
    weight: 40,
    roleId: "Science",
    assetKey: "item_placeholder",
  },
  {
    id: "ammo_crate",
    name: "Ammo Crate",
    weight: 30,
    roleId: "Science",
    assetKey: "item_placeholder",
  },
  {
    id: "targeting_sys",
    name: "Targeting System",
    weight: 20,
    roleId: "Science",
    assetKey: "item_placeholder",
  },
];

/** Look up a full GameItem by its id. Returns undefined if not found. */
export function getItemById(id: string): GameItem | undefined {
  return ITEMS.find((item) => item.id === id);
}

/** Get all items belonging to a specific role. */
export function getItemsByRole(roleId: string): GameItem[] {
  return ITEMS.filter((item) => item.roleId === roleId);
}
