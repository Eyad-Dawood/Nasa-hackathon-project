import { Theme, getRoleColor } from "../../config/theme";

/**
 * GameHUD
 * ───────
 * DOM overlay rendered on top of the Phaser canvas.
 * Shows: username, role badge, movement/interaction hints.
 *
 * WHAT IT DOES:
 *   - Mounts a fixed-position panel (top-left) with username + role badge.
 *   - Mounts a small hint bar (bottom-left) with control hints.
 *   - Provides refresh() to update username/role at runtime.
 *
 * WHAT IT DOES NOT DO:
 *   - Touch the Phaser scene or canvas.
 *   - Manage game state.
 */
export class GameHUD {
  private container: HTMLDivElement;
  private roleEl: HTMLSpanElement;
  private usernameEl: HTMLSpanElement;

  constructor(username: string, roleId: string) {
    this.container = document.createElement("div");
    this.container.id = "game-hud";

    const { usernameEl, roleEl } = this._buildDOM(username, roleId);
    this.usernameEl = usernameEl;
    this.roleEl = roleEl;
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }

  /**
   * Update the HUD labels — call if username or role changes at runtime.
   */
  refresh(username: string, roleId: string): void {
    this.usernameEl.textContent = username;
    this.roleEl.textContent = this._roleLabel(roleId);
    this.roleEl.style.background = getRoleColor(roleId);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private _roleLabel(roleId: string): string {
    const role = Theme.roles.find((r) => r.id === roleId);
    return role ? role.label : roleId;
  }

  private _buildDOM(username: string, roleId: string): {
    usernameEl: HTMLSpanElement;
    roleEl: HTMLSpanElement;
  } {
    const { colors, font, game } = Theme;

    // ── Top-left info panel ───────────────────────────────────────────
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      top: "12px",
      left: "12px",
      background: game.hudBg,
      border: `1px solid ${game.hudBorder}`,
      borderRadius: "8px",
      padding: "8px 14px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      fontFamily: font.family,
      zIndex: "500",
      pointerEvents: "none",   // don't block canvas clicks
    });

    // Username row
    const usernameRow = document.createElement("div");
    Object.assign(usernameRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    const avatarDot = document.createElement("span");
    Object.assign(avatarDot.style, {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: getRoleColor(roleId),
      display: "inline-block",
      flexShrink: "0",
    });

    const usernameEl = document.createElement("span");
    usernameEl.textContent = username;
    Object.assign(usernameEl.style, {
      color: colors.textPrimary,
      fontSize: font.sizeSm,
      fontWeight: "bold",
    });

    usernameRow.append(avatarDot, usernameEl);

    // Role badge row
    const roleRow = document.createElement("div");

    const roleEl = document.createElement("span");
    roleEl.textContent = this._roleLabel(roleId);
    Object.assign(roleEl.style, {
      background: getRoleColor(roleId),
      color: "#fff",
      fontSize: "10px",
      fontFamily: font.family,
      fontWeight: "bold",
      padding: "1px 8px",
      borderRadius: "999px",
      letterSpacing: "1px",
      textTransform: "uppercase",
    });

    roleRow.appendChild(roleEl);
    panel.append(usernameRow, roleRow);

    // ── Bottom-left hints bar ─────────────────────────────────────────
    const hints = document.createElement("div");
    Object.assign(hints.style, {
      position: "fixed",
      bottom: "12px",
      left: "12px",
      background: game.hudBg,
      border: `1px solid ${game.hudBorder}`,
      borderRadius: "6px",
      padding: "5px 12px",
      fontFamily: font.family,
      fontSize: "10px",
      color: colors.textMuted,
      zIndex: "500",
      pointerEvents: "none",
      letterSpacing: "0.5px",
    });
    hints.textContent = "WASD / ↑↓←→  Move   ·   E  Interact";

    this.container.append(panel, hints);

    return { usernameEl, roleEl };
  }
}
