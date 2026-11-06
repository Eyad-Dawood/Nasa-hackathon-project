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

      card.disabled = isTakenByOther;

      const label = card.querySelector(".role-label") as HTMLSpanElement | null;
      const statusBadge = card.querySelector(".role-status") as HTMLSpanElement | null;

      if (isMine) {
        card.style.background = "rgba(255, 255, 255, 0.14)";
        card.style.boxShadow = "inset 0 1px 1px rgba(255, 255, 255, 0.45), inset 0 0 0 0.5px rgba(255, 255, 255, 0.25), 0 8px 24px rgba(0, 0, 0, 0.35)";
        card.style.cursor = "pointer";
        card.style.opacity = "1";
        card.setAttribute("data-state", "mine");
        if (label) {
          label.style.background = "linear-gradient(180deg, #ffffff 30%, rgba(255, 255, 255, 0.85) 100%)";
          label.style.webkitBackgroundClip = "text";
          label.style.webkitTextFillColor = "transparent";
        }
        if (statusBadge) {
          statusBadge.textContent = "ASSIGNED";
          statusBadge.style.display = "inline-block";
          statusBadge.style.background = "rgba(255, 255, 255, 0.16)";
          statusBadge.style.color = "#ffffff";
        }
      } else if (isTakenByOther) {
        card.style.background = "rgba(255, 255, 255, 0.02)";
        card.style.boxShadow = "inset 0 0 0 0.5px rgba(255, 255, 255, 0.04)";
        card.style.cursor = "not-allowed";
        card.style.opacity = "0.35";
        card.setAttribute("data-state", "taken");
        if (label) {
          label.style.background = "none";
          label.style.webkitBackgroundClip = "unset";
          label.style.webkitTextFillColor = "rgba(255, 255, 255, 0.35)";
        }
        if (statusBadge) {
          statusBadge.textContent = "OCCUPIED";
          statusBadge.style.display = "inline-block";
          statusBadge.style.background = "rgba(255, 255, 255, 0.04)";
          statusBadge.style.color = "rgba(255, 255, 255, 0.35)";
        }
      } else {
        card.style.background = "rgba(255, 255, 255, 0.04)";
        card.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)";
        card.style.cursor = "pointer";
        card.style.opacity = "1";
        card.setAttribute("data-state", "free");
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
      gap: "10px",
    });

    const roleIconUrls: Record<string, string> = {
      powerAndThermal: Assets.powerAndThermalIcon.url,
      structureAndComputing: Assets.structureAndComputingIcon.url,
      Communications: Assets.CommunicationsIcon.url,
      Science: Assets.ScienceIcon.url,
    };

    for (const roleDef of Theme.roles) {
      const roleId = roleDef.id as RoleId;

      const card = document.createElement("button");
      Object.assign(card.style, {
        background: "rgba(255, 255, 255, 0.04)",
        boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.14), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(12px) saturate(1.4)",
        WebkitBackdropFilter: "blur(12px) saturate(1.4)",
        border: "none",
        borderRadius: "12px",
        color: colors.textPrimary,
        cursor: "pointer",
        fontFamily: font.family,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "4px",
        transition: `all ${transition.fast}`,
        boxSizing: "border-box",
      });

      const icon = document.createElement("img");
      icon.src = roleIconUrls[roleId as string] || "";
      Object.assign(icon.style, {
        width: "28px",
        height: "28px",
        objectFit: "contain",
      });

      const label = document.createElement("span");
      label.className = "role-label";
      label.textContent = roleDef.label;
      label.style.fontSize = font.sizeSm;
      label.style.fontWeight = "600";
      label.style.letterSpacing = "0.2px";

      const statusBadge = document.createElement("span");
      statusBadge.className = "role-status";
      Object.assign(statusBadge.style, {
        display: "none",
        fontSize: "9px",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "600",
        letterSpacing: "0.8px",
        padding: "2px 6px",
        borderRadius: "4px",
        textTransform: "uppercase",
      });

      const desc = document.createElement("span");
      desc.textContent = roleDef.description;
      desc.style.fontSize = "10px";
      desc.style.color = "rgba(255, 255, 255, 0.45)";
      desc.style.lineHeight = "1.3";

      card.append(icon, label, statusBadge, desc);

      card.addEventListener("mouseenter", () => {
        if (!card.disabled && card.getAttribute("data-state") !== "mine") {
          card.style.background = "rgba(255, 255, 255, 0.08)";
          card.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.24), inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)";
        }
      });
      card.addEventListener("mouseleave", () => {
        if (card.getAttribute("data-state") === "free") {
          card.style.background = "rgba(255, 255, 255, 0.04)";
          card.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.14), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)";
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
      color: colors.textSecondary,
      fontSize: "12px",
      fontWeight: "500",
      margin: "0 0 8px 0",
      letterSpacing: "0.5px",
    });

    this.mountEl.append(sectionLabel, grid);
  }
}
