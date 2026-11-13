import { Theme, ALL_ROLE_IDS, RoleId } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { Assets } from "../config/assets";

/**
 * RolePicker
 * ──────────
 * Shows the 4 role cards. The local player may claim/release roles.
 * Taken roles (owned by another player) are disabled.
 * A player can hold multiple roles if fewer than 4 players are present.
 *
 * Usage:
 *   const picker = new RolePicker(container, sessionId);
 *   picker.refresh(roleAssignments); // call whenever state changes
 */
export class RolePicker {
  private mountEl: HTMLElement;
  private sessionId: string;
  private cards: Map<RoleId, HTMLButtonElement> = new Map();

  constructor(mountEl: HTMLElement, sessionId: string) {
    this.mountEl = mountEl;
    this.sessionId = sessionId;
    this._buildDOM();
  }

  /**
   * Re-render based on current role assignments.
   * @param assignments Map of roleId → ownerSessionId (or null if free)
   */
  refresh(assignments: Record<RoleId, string | null>): void {
    for (const roleId of ALL_ROLE_IDS) {
      const card = this.cards.get(roleId)!;
      const owner = assignments[roleId];
      const isMine = owner === this.sessionId;
      const isTakenByOther = owner !== null && !isMine;

      const roleDef = Theme.roles.find((r) => r.id === roleId)!;
      const roleColor = roleDef.color;

      card.disabled = isTakenByOther;

      const label = card.querySelector(".role-label") as HTMLSpanElement | null;
      const statusBadge = card.querySelector(".role-status") as HTMLSpanElement | null;
      const iconWrap = card.querySelector(".role-icon-wrap") as HTMLDivElement | null;

      if (isMine) {
        card.style.background = `linear-gradient(145deg, ${roleColor}22 0%, ${roleColor}0d 60%, rgba(255,255,255,0.03) 100%)`;
        card.style.boxShadow = `inset 0 1px 1px ${roleColor}30, inset 0 0 0 0.5px ${roleColor}50, 0 8px 32px ${roleColor}28, 0 0 0 1px ${roleColor}40`;
        card.style.borderBottom = `2px solid ${roleColor}80`;
        card.style.cursor = "pointer";
        card.style.opacity = "1";
        card.style.transform = "scale(1)";
        card.setAttribute("data-state", "mine");
        if (iconWrap) {
          iconWrap.style.background = `${roleColor}30`;
          iconWrap.style.boxShadow = `0 0 20px ${roleColor}25, inset 0 0 0 1px ${roleColor}20`;
        }
        if (label) {
          label.style.background = `linear-gradient(180deg, #ffffff 20%, ${roleColor} 100%)`;
          label.style.webkitBackgroundClip = "text";
          label.style.webkitTextFillColor = "transparent";
        }
        if (statusBadge) {
          statusBadge.textContent = "ASSIGNED";
          statusBadge.style.display = "inline-flex";
          statusBadge.style.background = `${roleColor}25`;
          statusBadge.style.color = roleColor;
          statusBadge.style.boxShadow = `inset 0 0 0 0.5px ${roleColor}45`;
        }
      } else if (isTakenByOther) {
        card.style.background = "rgba(255, 255, 255, 0.02)";
        card.style.boxShadow = "inset 0 0 0 0.5px rgba(255, 255, 255, 0.04)";
        card.style.borderBottom = "2px solid transparent";
        card.style.cursor = "not-allowed";
        card.style.opacity = "0.35";
        card.style.transform = "scale(1)";
        card.setAttribute("data-state", "taken");
        if (iconWrap) {
          iconWrap.style.background = "rgba(255, 255, 255, 0.03)";
          iconWrap.style.boxShadow = "none";
        }
        if (label) {
          label.style.background = "none";
          label.style.webkitBackgroundClip = "unset";
          label.style.webkitTextFillColor = "rgba(255, 255, 255, 0.35)";
        }
        if (statusBadge) {
          statusBadge.textContent = "OCCUPIED";
          statusBadge.style.display = "inline-flex";
          statusBadge.style.background = "rgba(255, 255, 255, 0.04)";
          statusBadge.style.color = "rgba(255, 255, 255, 0.35)";
          statusBadge.style.boxShadow = "none";
        }
      } else {
        card.style.background = `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, ${roleColor}06 100%)`;
        card.style.boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px ${roleColor}15`;
        card.style.borderBottom = `2px solid ${roleColor}25`;
        card.style.cursor = "pointer";
        card.style.opacity = "1";
        card.style.transform = "scale(1)";
        card.setAttribute("data-state", "free");
        if (iconWrap) {
          iconWrap.style.background = `${roleColor}14`;
          iconWrap.style.boxShadow = `inset 0 0 0 1px ${roleColor}12`;
        }
        if (label) {
          label.style.background = "none";
          label.style.webkitBackgroundClip = "unset";
          label.style.webkitTextFillColor = "rgba(255, 255, 255, 0.9)";
        }
        if (statusBadge) {
          statusBadge.style.display = "none";
        }
      }
    }
  }

  private _buildDOM(): void {
    const { colors, font, transition } = Theme;

    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
    });

    const roleIconUrls: Record<string, string> = {
      powerAndThermal: Assets.powerAndThermalIcon.url,
      structureAndComputing: Assets.structureAndComputingIcon.url,
      Communications: Assets.CommunicationsIcon.url,
      Science: Assets.ScienceIcon.url,
    };

    for (const roleDef of Theme.roles) {
      const roleId = roleDef.id as RoleId;
      const roleColor = roleDef.color;

      const card = document.createElement("button");
      Object.assign(card.style, {
        background: `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, ${roleColor}06 100%)`,
        boxShadow: `inset 0 1px 0.5px rgba(255, 255, 255, 0.14), inset 0 0 0 0.5px ${roleColor}15`,
        backdropFilter: "blur(16px) saturate(1.5)",
        WebkitBackdropFilter: "blur(16px) saturate(1.5)",
        border: "none",
        borderBottom: `2px solid ${roleColor}25`,
        borderRadius: "14px",
        color: colors.textPrimary,
        cursor: "pointer",
        fontFamily: font.family,
        padding: "14px 14px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "6px",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      });

      // Icon container with role-tinted circular background
      const iconWrap = document.createElement("div");
      iconWrap.className = "role-icon-wrap";
      Object.assign(iconWrap.style, {
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: `${roleColor}14`,
        boxShadow: `inset 0 0 0 1px ${roleColor}12`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: "0",
      });

      const icon = document.createElement("img");
      icon.src = roleIconUrls[roleId as string] || "";
      Object.assign(icon.style, {
        width: "26px",
        height: "26px",
        objectFit: "contain",
        filter: "brightness(1.1)",
      });

      iconWrap.appendChild(icon);

      const label = document.createElement("span");
      label.className = "role-label";
      label.textContent = roleDef.label;
      Object.assign(label.style, {
        fontSize: "13px",
        fontWeight: "700",
        letterSpacing: "0.15px",
        lineHeight: "1.2",
      });

      const statusBadge = document.createElement("span");
      statusBadge.className = "role-status";
      Object.assign(statusBadge.style, {
        display: "none",
        fontSize: "9px",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.8px",
        padding: "3px 8px",
        borderRadius: "6px",
        textTransform: "uppercase",
        alignItems: "center",
        gap: "4px",
      });

      const desc = document.createElement("span");
      desc.textContent = roleDef.description;
      Object.assign(desc.style, {
        fontSize: "10px",
        color: "rgba(255, 255, 255, 0.4)",
        lineHeight: "1.35",
        maxWidth: "160px",
      });

      card.append(iconWrap, label, statusBadge, desc);

      card.addEventListener("mouseenter", () => {
        if (!card.disabled && card.getAttribute("data-state") !== "mine") {
          card.style.background = `linear-gradient(145deg, ${roleColor}12 0%, rgba(255,255,255,0.08) 50%, ${roleColor}08 100%)`;
          card.style.boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, 0.24), inset 0 0 0 0.5px ${roleColor}28, 0 4px 20px ${roleColor}12`;
          card.style.borderBottom = `2px solid ${roleColor}50`;
          card.style.transform = "scale(1.03)";
        }
      });
      card.addEventListener("mouseleave", () => {
        if (card.getAttribute("data-state") === "free") {
          card.style.background = `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, ${roleColor}06 100%)`;
          card.style.boxShadow = `inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px ${roleColor}15`;
          card.style.borderBottom = `2px solid ${roleColor}25`;
          card.style.transform = "scale(1)";
        }
      });

      card.addEventListener("click", () => {
        const state = card.getAttribute("data-state");
        if (state === "mine") {
          // Release
          ColyseusService.send("setRole", { role: roleId, claim: false });
        } else if (state === "free") {
          // Claim
          ColyseusService.send("setRole", { role: roleId, claim: true });
        }
      });

      this.cards.set(roleId, card);
      grid.appendChild(card);
    }

    const sectionLabel = document.createElement("h3");
    sectionLabel.textContent = "Subsystem Specialization";
    Object.assign(sectionLabel.style, {
      color: "rgba(255, 255, 255, 0.45)",
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: "500",
      margin: "0 0 10px 0",
      letterSpacing: "1px",
      textTransform: "uppercase",
    });

    this.mountEl.append(sectionLabel, grid);
  }
}
