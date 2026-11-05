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
  // ── Colours ──────────────────────────────────────────────────────────
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
  // Adding role display info here keeps it co-located with visual config.
  roles: [
    { id: "role1", label: "Role 1", color: "#e74c3c", description: "Placeholder – gameplay TBD" },
    { id: "role2", label: "Role 2", color: "#3498db", description: "Placeholder – gameplay TBD" },
    { id: "role3", label: "Role 3", color: "#2ecc71", description: "Placeholder – gameplay TBD" },
    { id: "role4", label: "Role 4", color: "#f39c12", description: "Placeholder – gameplay TBD" },
  ],
} as const;

export type RoleId = "role1" | "role2" | "role3" | "role4";
export const ALL_ROLE_IDS: RoleId[] = Theme.roles.map((r) => r.id as RoleId);
