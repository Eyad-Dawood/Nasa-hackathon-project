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
  private onExitCallback?: () => void;
  private onAutoFillCallback?: () => void;

  constructor(
    username: string,
    roleIds: string[],
    missionTitle?: string,
    onExit?: () => void,
    onAutoFill?: () => void,
  ) {
    this.container = document.createElement("div");
    this.container.id = "game-hud";
    this.onExitCallback = onExit;
    this.onAutoFillCallback = onAutoFill;

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

    // ── Top-right Controls Bar (Exit + Dev Cheat Button) ───────────────
    const topControls = document.createElement("div");
    Object.assign(topControls.style, {
      position: "fixed",
      top: "18px",
      right: "18px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      zIndex: "600",
      pointerEvents: "auto",
    });

    // Magic Auto-Fill Ship Button (Double-tap G or click)
    const cheatBtn = document.createElement("button");
    cheatBtn.id = "hud-cheat-btn";
    cheatBtn.title = "Developer Cheat: Auto-fill ship with 12/12 launch ready build (Press 'GG')";
    cheatBtn.innerHTML = `<span>⚡</span><span>Auto-Fill Ship</span><b style="background:rgba(255,255,255,0.18); padding:1px 5px; border-radius:4px; font-size:9px;">GG</b>`;
    Object.assign(cheatBtn.style, {
      background: "rgba(16, 185, 129, 0.15)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(16, 185, 129, 0.35), 0 8px 24px rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(14px) saturate(1.4)",
      WebkitBackdropFilter: "blur(14px) saturate(1.4)",
      border: "1px solid rgba(16, 185, 129, 0.4)",
      borderRadius: "10px",
      color: "#34D399",
      cursor: "pointer",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      fontWeight: "700",
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      transition: "all 0.15s ease",
    });
    cheatBtn.addEventListener("mouseenter", () => {
      cheatBtn.style.background = "rgba(16, 185, 129, 0.3)";
      cheatBtn.style.color = "#ffffff";
    });
    cheatBtn.addEventListener("mouseleave", () => {
      cheatBtn.style.background = "rgba(16, 185, 129, 0.15)";
      cheatBtn.style.color = "#34D399";
    });
    cheatBtn.addEventListener("click", () => {
      if (this.onAutoFillCallback) {
        this.onAutoFillCallback();
      }
    });

    // Exit Station Button
    const backBtn = document.createElement("button");
    backBtn.id = "hud-back-btn";
    backBtn.innerHTML = `<span>⎋</span><span>Exit To Orbit</span>`;
    Object.assign(backBtn.style, {
      background: "rgba(255, 255, 255, 0.06)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.18), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(14px) saturate(1.4)",
      WebkitBackdropFilter: "blur(14px) saturate(1.4)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "10px",
      color: "rgba(255, 255, 255, 0.8)",
      cursor: "pointer",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      fontWeight: "600",
      padding: "8px 14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.15s ease",
    });

    backBtn.addEventListener("mouseenter", () => {
      backBtn.style.background = "rgba(239, 68, 68, 0.18)";
      backBtn.style.borderColor = "rgba(239, 68, 68, 0.45)";
      backBtn.style.color = "#ffffff";
    });
    backBtn.addEventListener("mouseleave", () => {
      backBtn.style.background = "rgba(255, 255, 255, 0.06)";
      backBtn.style.borderColor = "rgba(255, 255, 255, 0.1)";
      backBtn.style.color = "rgba(255, 255, 255, 0.8)";
    });
    backBtn.addEventListener("click", () => {
      if (this.onExitCallback) {
        this.onExitCallback();
      } else {
        window.location.reload();
      }
    });

    topControls.append(cheatBtn, backBtn);
    this.container.append(panel, hints, topControls);
    return { usernameEl, rolesContainer, missionEl };
  }

  public showCheatToast(message: string): void {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      top: "22px",
      left: "50%",
      transform: "translateX(-50%) translateY(-20px)",
      background: "rgba(16, 185, 129, 0.95)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(52, 211, 153, 0.6)",
      color: "#040810",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "12px",
      fontWeight: "800",
      letterSpacing: "0.5px",
      padding: "10px 22px",
      borderRadius: "20px",
      zIndex: "3000",
      pointerEvents: "none",
      opacity: "0",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}
