import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";

/**
 * ObjectivePicker
 * ───────────────
 * DOM overlay shown between the lobby and the game.
 *
 * HOST VIEW:
 *   - Shows a card for each placeholder objective.
 *   - Clicking "Select" sends "selectObjective" to the GameRoom.
 *   - After confirming, the button shows "Confirming…" (disabled).
 *
 * NON-HOST VIEW:
 *   - Shows a "Waiting for host to select the objective…" message.
 *   - Cards are visible but all Select buttons are hidden.
 *
 * HOW TO REPLACE PLACEHOLDER CONTENT:
 *   - Edit ObjectiveData.ts to change cards.
 *   - Edit _buildCard() here to change card layout (icons, difficulty, etc.)
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
    const { colors, font, spacing, radius } = Theme;

    // Full-screen overlay
    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.88)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    // Card panel
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: "520px",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: spacing.md,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    });

    // Header
    const title = document.createElement("h2");
    title.textContent = "Select Objective";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: font.sizeLg,
      margin: "0",
      letterSpacing: "2px",
    });

    const subtitle = document.createElement("p");
    subtitle.textContent = this.isHost
      ? "Choose an objective for this session."
      : "Waiting for the host to select an objective…";
    Object.assign(subtitle.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0",
    });

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border;
    divider.style.margin = "0";

    // Objective cards
    const cardsContainer = document.createElement("div");
    Object.assign(cardsContainer.style, {
      display: "flex",
      flexDirection: "column",
      gap: spacing.sm,
    });

    OBJECTIVES.forEach((obj) => {
      cardsContainer.appendChild(this._buildCard(obj));
    });

    panel.append(title, subtitle, divider, cardsContainer);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildCard(obj: Objective): HTMLDivElement {
    const { colors, font, spacing, radius, transition } = Theme;

    const card = document.createElement("div");
    Object.assign(card.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: `${spacing.sm} ${spacing.md}`,
      gap: spacing.md,
      transition: `border-color ${transition.fast}`,
    });

    // Text block
    const textBlock = document.createElement("div");
    Object.assign(textBlock.style, {
      display: "flex",
      flexDirection: "column",
      gap: "3px",
      flex: "1",
    });

    const label = document.createElement("span");
    label.textContent = obj.label;
    Object.assign(label.style, {
      color: colors.textPrimary,
      fontSize: font.sizeMd,
      fontWeight: "bold",
    });

    const desc = document.createElement("span");
    desc.textContent = obj.description;
    Object.assign(desc.style, {
      color: colors.textMuted,
      fontSize: font.sizeXs,
    });

    textBlock.append(label, desc);

    // Select button (host only)
    if (this.isHost) {
      const btn = document.createElement("button");
      btn.textContent = "Select";
      Object.assign(btn.style, {
        background: colors.accent,
        border: "none",
        borderRadius: radius.sm,
        color: "#fff",
        cursor: "pointer",
        fontFamily: font.family,
        fontSize: font.sizeSm,
        fontWeight: "bold",
        padding: `${spacing.xs} ${spacing.md}`,
        transition: `background ${transition.fast}`,
        whiteSpace: "nowrap",
        flexShrink: "0",
      });

      btn.addEventListener("mouseenter", () => {
        if (!btn.disabled) btn.style.background = colors.accentHover;
      });
      btn.addEventListener("mouseleave", () => {
        if (!btn.disabled) btn.style.background = colors.accent;
      });

      btn.addEventListener("click", () => {
        // Disable all cards immediately to prevent double-select
        this.container.querySelectorAll("button").forEach((b) => {
          (b as HTMLButtonElement).disabled = true;
          (b as HTMLButtonElement).style.background = colors.disabled;
          (b as HTMLButtonElement).style.cursor = "not-allowed";
          (b as HTMLButtonElement).textContent = "Select";
        });
        btn.textContent = "Confirming…";
        card.style.borderColor = colors.accent;

        ColyseusService.send("selectObjective", { objectiveId: obj.id });
      });

      card.append(textBlock, btn);
    } else {
      card.appendChild(textBlock);
    }

    return card;
  }
}
