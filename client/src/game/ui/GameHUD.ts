import { Theme, getRoleColor } from "../../config/theme";

/**
 * GameHUD
 * ───────
 * Flight Telemetry Heads-Up Display (HUD).
 * Unslopped design:
 *   - Compact vertical layout (fixed 180px width) so it never intrudes on the game arena.
 *   - Subdued role badges with indicator dots stacked vertically.
 *   - Active mission directive indicator.
 */
export class GameHUD {
  private container: HTMLDivElement;
  private rolesContainer: HTMLDivElement;
  private usernameEl: HTMLSpanElement;
  private missionEl: HTMLSpanElement;

  constructor(username: string, roleIds: string[], missionTitle?: string) {
    this.container = document.createElement("div");
    this.container.id = "game-hud";

    const { usernameEl, rolesContainer, missionEl } = this._buildDOM(
      username,
      roleIds,
      missionTitle ?? "Awaiting Directive",
    );
    this.usernameEl = usernameEl;
    this.rolesContainer = rolesContainer;
    this.missionEl = missionEl;
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }

  refresh(username: string, roleIds: string[], missionTitle?: string): void {
    this.usernameEl.textContent = username;
    if (missionTitle) this.missionEl.textContent = missionTitle;

    this.rolesContainer.innerHTML = "";
    roleIds.forEach((roleId) => {
      this.rolesContainer.appendChild(this._createRoleBadge(roleId));
    });
  }

  private _roleLabel(roleId: string): string {
    const role = Theme.roles.find((r) => r.id === roleId);
    return role ? role.label : roleId;
  }

  private _createRoleBadge(roleId: string): HTMLSpanElement {
    const roleEl = document.createElement("span");
    Object.assign(roleEl.style, {
      background: "rgba(255, 255, 255, 0.06)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      color: "rgba(255, 255, 255, 0.88)",
      fontSize: "11px",
      fontFamily: Theme.font.family,
      fontWeight: "500",
      padding: "4px 8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      transition: "all 0.15s ease",
    });

    const text = document.createElement("span");
    text.textContent = this._roleLabel(roleId).replace("And", "&");
    text.style.overflow = "hidden";
    text.style.textOverflow = "ellipsis";

    const tag = document.createElement("span");
    tag.textContent = "AUTH";
    Object.assign(tag.style, {
      fontSize: "9px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.45)",
      letterSpacing: "0.5px",
    });

    roleEl.append(text, tag);
    return roleEl;
  }

  private _buildDOM(
    username: string,
    roleIds: string[],
    missionTitle: string,
  ): {
    usernameEl: HTMLSpanElement;
    rolesContainer: HTMLDivElement;
    missionEl: HTMLSpanElement;
  } {
    const { colors, font } = Theme;

    // ── Liquid Glass Vertical Telemetry Panel (Left Edge) ────────────
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      top: "18px",
      left: "18px",
      width: "190px",
      background: "rgba(255, 255, 255, 0.05)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 16px 36px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(16px) saturate(1.4)",
      WebkitBackdropFilter: "blur(16px) saturate(1.4)",
      borderRadius: "14px",
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      fontFamily: font.family,
      zIndex: "500",
      pointerEvents: "none",
    });

    // Operator Name Row - Monochrome
    const userBlock = document.createElement("div");
    Object.assign(userBlock.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      paddingBottom: "8px",
    });

    const usernameEl = document.createElement("span");
    usernameEl.textContent = username;
    Object.assign(usernameEl.style, {
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      letterSpacing: "0.2px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });

    const opBadge = document.createElement("span");
    opBadge.textContent = "OPERATOR";
    Object.assign(opBadge.style, {
      background: "rgba(255, 255, 255, 0.1)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
      borderRadius: "5px",
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "9px",
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: "600",
      letterSpacing: "0.8px",
      padding: "2px 6px",
    });

    userBlock.append(usernameEl, opBadge);

    // Directive Block
    const missionTag = document.createElement("div");
    Object.assign(missionTag.style, {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      fontSize: "10.5px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      paddingBottom: "8px",
    });

    const missionHeader = document.createElement("span");
    missionHeader.textContent = "DIRECTIVE";
    Object.assign(missionHeader.style, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "9.5px",
      letterSpacing: "1px",
      color: "rgba(255, 255, 255, 0.4)",
      textTransform: "uppercase",
    });

    const missionEl = document.createElement("span");
    missionEl.id = "hud-mission-title";
    missionEl.textContent = missionTitle;
    Object.assign(missionEl.style, {
      color: "#ffffff",
      fontWeight: "500",
      fontSize: "11.5px",
      lineHeight: "1.3",
    });

    missionTag.append(missionHeader, missionEl);

    // Subsystem Specializations Label
    const rolesHeader = document.createElement("div");
    rolesHeader.textContent = "CREDENTIALS";
    Object.assign(rolesHeader.style, {
      fontSize: "9.5px",
      color: "rgba(255, 255, 255, 0.4)",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "1px",
      textTransform: "uppercase",
    });

    // Role Badges Column (Vertical Stack)
    const rolesContainer = document.createElement("div");
    Object.assign(rolesContainer.style, {
      display: "flex",
      flexDirection: "column",
      gap: "5px",
    });

    roleIds.forEach((roleId) => {
      rolesContainer.appendChild(this._createRoleBadge(roleId));
    });

    panel.append(userBlock, missionTag, rolesHeader, rolesContainer);

    // ── Bottom-left Controls Hint Bar - Liquid Glass ────────────────────
    const hints = document.createElement("div");
    Object.assign(hints.style, {
      position: "fixed",
      bottom: "18px",
      left: "18px",
      background: "rgba(255, 255, 255, 0.05)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.18), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(12px) saturate(1.4)",
      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      borderRadius: "20px",
      padding: "6px 14px",
      fontFamily: font.family,
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.65)",
      zIndex: "500",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    hints.innerHTML = `
      <span><b style="color:#ffffff; font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.12); padding:2px 5px; border-radius:4px; font-weight:500;">WASD</b> Move</span>
      <span style="color:rgba(255,255,255,0.2);">·</span>
      <span><b style="color:#ffffff; font-family:'JetBrains Mono', monospace; background:rgba(255,255,255,0.12); padding:2px 5px; border-radius:4px; font-weight:500;">E</b> Interact</span>
    `;

    this.container.append(panel, hints);
    return { usernameEl, rolesContainer, missionEl };
  }
}
