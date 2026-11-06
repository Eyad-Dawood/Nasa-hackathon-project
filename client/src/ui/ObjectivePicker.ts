import { createElement, Rocket, Compass, Scale, Check, Clock } from "lucide";
import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";

/**
 * ObjectivePicker
 * ───────────────
 * Pre-flight Mission Directive Selection.
 * Unslopped aerospace design:
 *   - Clean cards with destination, payload ceiling, and difficulty profile.
 *   - Quiet hairlines, tabular monospace numbers.
 *   - Clear distinction between Host controls and crew waiting state.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;

  constructor(isHost: boolean) {
    this.isHost = isHost;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }

  // ── Private ──────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { colors, font } = Theme;

    // Full-screen overlay
    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(8, 10, 16, 0.92)",
      backdropFilter: "blur(8px)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    // Main Card Panel
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: "10px",
      padding: "24px 28px",
      width: "560px",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
    });

    // Header Row
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    });

    const titleRow = document.createElement("div");
    Object.assign(titleRow.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    });

    const title = document.createElement("h2");
    title.textContent = "NASA Flight Directives";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: "18px",
      fontWeight: "600",
      letterSpacing: "0.5px",
      margin: "0",
    });

    const statusPill = document.createElement("span");
    statusPill.style.display = "flex";
    statusPill.style.alignItems = "center";
    statusPill.style.gap = "6px";
    statusPill.style.fontSize = "11px";
    statusPill.style.fontFamily = font.mono;
    statusPill.style.color = this.isHost ? colors.accent : colors.textMuted;
    statusPill.style.background = colors.surfaceRaised;
    statusPill.style.border = `1px solid ${colors.border}`;
    statusPill.style.padding = "3px 8px";
    statusPill.style.borderRadius = "4px";

    if (this.isHost) {
      statusPill.appendChild(createElement(Rocket, { width: 12, height: 12, "stroke-width": 1.5 }));
      const hostLabel = document.createElement("span");
      hostLabel.textContent = "MISSION COMMANDER";
      statusPill.appendChild(hostLabel);
    } else {
      statusPill.appendChild(createElement(Clock, { width: 12, height: 12, "stroke-width": 1.5 }));
      const waitLabel = document.createElement("span");
      waitLabel.textContent = "AWAITING COMMAND";
      statusPill.appendChild(waitLabel);
    }

    titleRow.append(title, statusPill);

    const subtitle = document.createElement("p");
    subtitle.textContent = this.isHost
      ? "Select the primary mission profile for your engineering team."
      : "Mission Commander is configuring the mission flight profile...";
    Object.assign(subtitle.style, {
      color: colors.textSecondary,
      fontSize: "13px",
      margin: "0",
    });

    header.append(titleRow, subtitle);

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border as string;
    divider.style.margin = "0";

    // Cards Container
    const cardsContainer = document.createElement("div");
    Object.assign(cardsContainer.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    OBJECTIVES.forEach((obj) => {
      cardsContainer.appendChild(this._buildCard(obj));
    });

    panel.append(header, divider, cardsContainer);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildCard(obj: Objective): HTMLDivElement {
    const { colors, font } = Theme;

    const card = document.createElement("div");
    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      background: colors.surfaceRaised,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      padding: "14px 16px",
      gap: "10px",
      transition: "border-color 0.15s ease",
    });

    // Top Row: Title + Destination + Difficulty
    const topRow = document.createElement("div");
    Object.assign(topRow.style, {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "12px",
    });

    const infoLeft = document.createElement("div");
    Object.assign(infoLeft.style, {
      display: "flex",
      flexDirection: "column",
      gap: "3px",
    });

    const label = document.createElement("span");
    label.textContent = obj.label;
    Object.assign(label.style, {
      color: colors.textPrimary,
      fontSize: "14px",
      fontWeight: "600",
    });

    const metaRow = document.createElement("div");
    Object.assign(metaRow.style, {
      display: "flex",
      gap: "10px",
      fontSize: "11px",
      color: colors.textMuted,
      fontFamily: font.mono,
    });

    metaRow.innerHTML = `
      <span>Target: <b style="color:${colors.accent};">${obj.target}</b></span>
      <span>Payload Ceiling: <b style="color:${colors.textPrimary};">${obj.maxWeight} kg</b></span>
    `;

    infoLeft.append(label, metaRow);

    // Difficulty badge
    const diffBadge = document.createElement("span");
    diffBadge.textContent = obj.difficulty;
    let diffColor = colors.success;
    if (obj.difficulty === "Challenging") diffColor = colors.warning;
    if (obj.difficulty === "Extreme") diffColor = colors.danger;

    Object.assign(diffBadge.style, {
      fontSize: "10px",
      fontFamily: font.mono,
      fontWeight: "500",
      color: diffColor,
      background: "#080a10",
      border: `1px solid ${colors.border}`,
      padding: "2px 8px",
      borderRadius: "4px",
    });

    topRow.append(infoLeft, diffBadge);

    // Description
    const desc = document.createElement("p");
    desc.textContent = obj.description;
    Object.assign(desc.style, {
      color: colors.textSecondary,
      fontSize: "12px",
      lineHeight: "1.45",
      margin: "0",
    });

    card.append(topRow, desc);

    // If host: add select button
    if (this.isHost) {
      const actionRow = document.createElement("div");
      Object.assign(actionRow.style, {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "4px",
      });

      const btn = document.createElement("button");
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.gap = "6px";
      btn.appendChild(createElement(Check, { width: 13, height: 13, "stroke-width": 2 }));
      const btnLabel = document.createElement("span");
      btnLabel.textContent = "Select Directive";
      btn.appendChild(btnLabel);

      Object.assign(btn.style, {
        background: colors.accent,
        border: "none",
        borderRadius: "4px",
        color: "#080a10",
        fontSize: "12px",
        fontWeight: "600",
        fontFamily: font.family,
        padding: "6px 14px",
        cursor: "pointer",
        transition: "background 0.15s ease",
      });

      btn.addEventListener("mouseenter", () => (btn.style.background = colors.accentHover));
      btn.addEventListener("mouseleave", () => (btn.style.background = colors.accent));
      btn.addEventListener("click", () => {
        btn.disabled = true;
        btnLabel.textContent = "Authorizing...";
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";

        ColyseusService.selectObjective(obj.id);
      });

      actionRow.appendChild(btn);
      card.appendChild(actionRow);
    }

    return card;
  }
}
