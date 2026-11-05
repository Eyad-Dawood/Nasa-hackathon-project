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

      if (isMine) {
        card.style.borderColor = roleDef.color;
        card.style.background = `${roleDef.color}22`;
        card.style.color = Theme.colors.textPrimary;
        card.style.cursor = "pointer";
        card.setAttribute("data-state", "mine");
      } else if (isTakenByOther) {
        card.style.borderColor = Theme.colors.disabled;
        card.style.background = "transparent";
        card.style.color = Theme.colors.textMuted;
        card.style.cursor = "not-allowed";
        card.setAttribute("data-state", "taken");
      } else {
        card.style.borderColor = Theme.colors.border;
        card.style.background = "transparent";
        card.style.color = Theme.colors.textPrimary;
        card.style.cursor = "pointer";
        card.setAttribute("data-state", "free");
      }
    }
  }

  private _buildDOM(): void {
    const { colors, font, spacing, radius, transition } = Theme;

    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: spacing.md,
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
        background: "transparent",
        border: `2px solid ${colors.border}`,
        borderRadius: radius.md,
        color: colors.textPrimary,
        cursor: "pointer",
        fontFamily: font.family,
        padding: spacing.md,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing.xs,
        transition: `all ${transition.fast}`,
      });

      // [جديد]: استبدال الـ div بـ img
      const icon = document.createElement("img");
      icon.src = roleIconUrls[roleId as string] || ""; // هنسحب المسار من الماب
      Object.assign(icon.style, {
        width: "32px",
        height: "32px",
        objectFit: "contain",
      });

      const label = document.createElement("span");
      label.textContent = roleDef.label;
      label.style.fontSize = font.sizeMd;
      label.style.fontWeight = "bold";

      const desc = document.createElement("span");
      desc.textContent = roleDef.description;
      desc.style.fontSize = font.sizeXs;
      desc.style.color = colors.textMuted;

      // ضفنا icon بدل dot
      card.append(icon, label, desc);

      card.addEventListener("mouseenter", () => {
        if (!card.disabled && card.getAttribute("data-state") !== "mine") {
          card.style.borderColor = roleDef.color;
        }
      });
      card.addEventListener("mouseleave", () => {
        if (card.getAttribute("data-state") === "free") {
          card.style.borderColor = colors.border;
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
    sectionLabel.textContent = "Select Your Role(s)";
    Object.assign(sectionLabel.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0 0 4px 0",
      letterSpacing: "1px",
      textTransform: "uppercase",
    });

    this.mountEl.append(sectionLabel, grid);
  }
}
