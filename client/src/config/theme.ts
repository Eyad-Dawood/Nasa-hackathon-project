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
  // ── UI Colours (Ink / Aerospace Dark Ramp) ─────────────────────────────
  colors: {
    /** Main page / overlay background */
    background: "#080a10",
    /** Panel / card surfaces */
    surface: "#0f131d",
    /** Raised surface (active row, inputs) */
    surfaceRaised: "#161c2b",
    /** Accent – flight telemetry sky/cobalt */
    accent: "#38bdf8",
    /** Secondary accent – hover states */
    accentHover: "#0284c7",
    /** Positive / nominal state */
    success: "#34d399",
    /** Warning / caution state */
    warning: "#fbbf24",
    /** Critical / error state */
    danger: "#f87171",
    /** Disabled / unavailable state */
    disabled: "#374151",
    /** Primary text */
    textPrimary: "#f0f2f5",
    /** Secondary text */
    textSecondary: "#9ca3af",
    /** Muted text / captions / icons */
    textMuted: "#6b7280",
    /** Quiet hairline border */
    border: "rgba(255, 255, 255, 0.08)",
    /** Border highlight */
    borderHighlight: "rgba(56, 189, 248, 0.25)",
    /** Host badge colour */
    hostBadge: "#f59e0b",
    /** Ready / role-locked badge */
    readyBadge: "#10b981",
  },

  // ── Game World Colours ────────────────────────────────────────────────
  // Used both for procedural texture generation (BootScene) and
  // in-game UI elements (InteractionSystem dialogue, GameHUD).
  game: {
    // Tiles
    tileGrass: 0x1f293d, // dark floor tile
    tileGrassLine: 0x161d2d, // grid line
    tileWall: 0x2d3748, // wall fill
    tileWallEdge: 0x4a5568, // wall highlight edge
    tileWater: 0x0f172a, // technical gap / trench
    tileWaterSheen: 0x1e293b,

    // Sprites
    npcFill: 0x38bdf8, // NPC body colour
    npcDot: 0x080a10, // NPC indicator dot
    playerDot: 0x000000, // player center dot

    // HUD & dialogue (CSS strings for DOM elements)
    hudBg: "rgba(11, 14, 23, 0.88)",
    hudBorder: "rgba(255, 255, 255, 0.08)",
    hudText: "#f0f2f5",
    hudMuted: "#9ca3af",

    // In-game interaction prompt + dialogue (Phaser colour numbers)
    interactPrompt: 0x38bdf8, // "E — Talk" label colour
    dialogueBg: 0x0f131d, // dialogue box fill
    dialogueBorder: 0x38bdf8, // dialogue box border
    dialogueText: 0xf0f2f5, // dialogue body text
    dialogueName: 0x38bdf8, // NPC name in dialogue header
  },

  // ── Fonts ─────────────────────────────────────────────────────────────
  font: {
    family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', monospace",
    sizeXs: "11px",
    sizeSm: "13px",
    sizeMd: "14px",
    sizeLg: "18px",
    sizeXl: "24px",
    sizeTitle: "32px",
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
      color: "#f87171",
      hex: 0xf87171,
      description: "Power bus, solar arrays, and thermal radiator dissipation",
    },
    {
      id: "structureAndComputing",
      label: "Structure And Computing",
      color: "#38bdf8",
      hex: 0x38bdf8,
      description: "Flight computers, guidance avionics, and radar systems",
    },
    {
      id: "Communications",
      label: "Communications",
      color: "#34d399",
      hex: 0x34d399,
      description: "High-gain transceivers, telemetry, and shield arrays",
    },
    {
      id: "Science",
      label: "Science",
      color: "#fbbf24",
      hex: 0xfbbf24,
      description: "Scientific sensor payloads and analytical instruments",
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
