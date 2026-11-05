/**
 * theme.ts
 * ────────
 * Single source of truth for every colour, font, and UI dimension.
 *
 * HOW TO USE:
 *   import { Theme } from "../config/theme";
 *   element.style.background = Theme.colors.background;
 *   element.style.fontFamily = Theme.font.family;
 *
 * HOW TO MODIFY:
 *   Change a value here and it propagates to every component automatically.
 */

export const Theme = {
  // ── UI Colours ────────────────────────────────────────────────────────
  colors: {
    /** Main page / overlay background */
    background: "#0d0d1a",
    /** Panel / card surfaces */
    surface: "#16213e",
    /** Accent – buttons, highlights */
    accent: "#e94560",
    /** Secondary accent – hover states */
    accentHover: "#c73652",
    /** Positive / enabled state */
    success: "#2ecc71",
    /** Disabled / unavailable state */
    disabled: "#555577",
    /** Primary text */
    textPrimary: "#eaeaea",
    /** Secondary / muted text */
    textMuted: "#8888aa",
    /** Border / divider lines */
    border: "#2a2a4a",
    /** Host badge colour */
    hostBadge: "#f39c12",
    /** Ready / role-locked badge */
    readyBadge: "#27ae60",
  },

  // ── Game World Colours ────────────────────────────────────────────────
  // Used both for procedural texture generation (BootScene) and
  // in-game UI elements (InteractionSystem dialogue, GameHUD).
  game: {
    // Tiles
    tileGrass: 0x3a7d44, // grass fill      (Phaser hex number)
    tileGrassLine: 0x2f6636, // grid line
    tileWall: 0x4a4a6a, // wall fill
    tileWallEdge: 0x6a6a9a, // wall highlight edge
    tileWater: 0x1a5276, // water fill
    tileWaterSheen: 0x1f618d, // water sheen stripe

    // Sprites
    npcFill: 0xf4d03f, // NPC body colour
    npcDot: 0x1a1a2e, // NPC indicator dot
    playerDot: 0x000000, // player center dot

    // HUD & dialogue (CSS strings for DOM elements)
    hudBg: "rgba(13,13,26,0.85)",
    hudBorder: "#2a2a4a",
    hudText: "#eaeaea",
    hudMuted: "#8888aa",

    // In-game interaction prompt + dialogue (Phaser colour numbers)
    interactPrompt: 0xf4d03f, // "E — Talk" label colour
    dialogueBg: 0x16213e, // dialogue box fill
    dialogueBorder: 0xe94560, // dialogue box border
    dialogueText: 0xeaeaea, // dialogue body text
    dialogueName: 0xf4d03f, // NPC name in dialogue header
  },

  // ── Fonts ─────────────────────────────────────────────────────────────
  font: {
    family: "'Courier New', Courier, monospace",
    sizeXs: "11px",
    sizeSm: "13px",
    sizeMd: "15px",
    sizeLg: "20px",
    sizeXl: "26px",
    sizeTitle: "36px",
  },

  // ── Spacing ───────────────────────────────────────────────────────────
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  },

  // ── Borders ───────────────────────────────────────────────────────────
  radius: {
    sm: "4px",
    md: "8px",
    lg: "14px",
    full: "9999px",
  },

  // ── Transitions ───────────────────────────────────────────────────────
  transition: {
    fast: "0.15s ease",
    normal: "0.25s ease",
  },

  // ── Role definitions ──────────────────────────────────────────────────
  roles: [
    {
      id: "powerAndThermal",
      label: "Power And Thermal",
      color: "#e74c3c",
      hex: 0xe74c3c,
      description: "Placeholder – gameplay TBD",
    },
    {
      id: "structureAndComputing",
      label: "Structure And Computing",
      color: "#3498db",
      hex: 0x3498db,
      description: "Placeholder – gameplay TBD",
    },
    {
      id: "Communications",
      label: "Communications",
      color: "#2ecc71",
      hex: 0x2ecc71,
      description: "Placeholder – gameplay TBD",
    },
    {
      id: "Science",
      label: "Science",
      color: "#f39c12",
      hex: 0xf39c12,
      description: "Placeholder – gameplay TBD",
    },
  ],
} as const;

export type RoleId =
  | "powerAndThermal"
  | "structureAndComputing"
  | "Communications"
  | "Science";
export const ALL_ROLE_IDS: RoleId[] = Theme.roles.map((r) => r.id as RoleId);

/** Returns the hex number for a given roleId (for Phaser tint). */
export function getRoleHex(roleId: RoleId | string): number {
  const role = Theme.roles.find((r) => r.id === roleId);
  return role ? role.hex : 0xffffff;
}

/** Returns the CSS colour string for a given roleId (for DOM elements). */
export function getRoleColor(roleId: RoleId | string): string {
  const role = Theme.roles.find((r) => r.id === roleId);
  return role ? role.color : "#ffffff";
}

/** Returns the human-readable label for a given roleId (e.g. "Power And Thermal"). */
export function getRoleLabel(roleId: RoleId | string): string {
  const role = Theme.roles.find((r) => r.id === roleId);
  return role ? role.label : roleId;
}
