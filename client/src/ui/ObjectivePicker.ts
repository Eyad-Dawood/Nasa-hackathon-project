import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";

/**
 * ObjectivePicker
 * ───────────────
 * DOM overlay shown between the lobby and the game.
 *
 * HOST VIEW:   Shows mission cards; clicking "Select" sends "selectObjective".
 * NON-HOST VIEW: Shows cards (read-only) + "Waiting for host…" message.
 *
 * HOW TO CHANGE CARD LAYOUT:
 *   Edit _buildCard() — it reads full Objective data from ObjectiveData.ts.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;

  constructor(isHost: boolean) {
    this.isHost    = isHost;
    this.container = this._buildDOM();
  }

  mount():   void { document.body.appendChild(this.container); }
  destroy(): void { this.container.remove(); }

  // ── Private ──────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.90)", zIndex: "1000", fontFamily: font.family,
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: radius.lg, padding: spacing.xl,
      width: "600px", maxWidth: "95vw", maxHeight: "88vh",
      display: "flex", flexDirection: "column", gap: spacing.md,
      boxShadow: "0 8px 60px rgba(0,0,0,0.7)", overflowY: "auto",
    });

    // Header
    const title = document.createElement("h2");
    title.textContent = "🌌 Select Mission";
    Object.assign(title.style, { color: colors.textPrimary, fontSize: font.sizeXl, margin: "0", letterSpacing: "2px" });

    const subtitle = document.createElement("p");
    subtitle.textContent = this.isHost
      ? "Choose a mission for your crew."
      : "Waiting for the host to select a mission…";
    Object.assign(subtitle.style, { color: colors.textMuted, fontSize: font.sizeSm, margin: "0" });

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border; divider.style.margin = "0";

    const cardsContainer = document.createElement("div");
    Object.assign(cardsContainer.style, { display: "flex", flexDirection: "column", gap: spacing.sm });

    OBJECTIVES.forEach((obj) => cardsContainer.appendChild(this._buildCard(obj)));

    panel.append(title, subtitle, divider, cardsContainer);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildCard(obj: Objective): HTMLDivElement {
    const { colors, font, spacing, radius, transition } = Theme;

    // Difficulty badge color
    const diffColor: Record<string, string> = {
      Easy:   "#2ecc71",
      Medium: "#f39c12",
      Hard:   "#e94560",
      Expert: "#9b59b6",
    };
    const badgeColor = diffColor[obj.difficulty] ?? "#888";

    // Stars string
    const stars = "★".repeat(obj.stars) + "☆".repeat(4 - obj.stars);

    const card = document.createElement("div");
    Object.assign(card.style, {
      display: "flex", flexDirection: "column", gap: spacing.sm,
      background: colors.background, border: `1px solid ${colors.border}`,
      borderRadius: radius.md, padding: spacing.md,
      transition: `border-color ${transition.fast}`,
    });

    // ── Top row: title + stars + difficulty + select button ──
    const topRow = document.createElement("div");
    Object.assign(topRow.style, { display: "flex", alignItems: "center", gap: spacing.sm });

    const titleEl = document.createElement("span");
    titleEl.textContent = obj.label;
    Object.assign(titleEl.style, { color: colors.textPrimary, fontSize: font.sizeMd, fontWeight: "bold", flex: "1" });

    const starsEl = document.createElement("span");
    starsEl.textContent = stars;
    Object.assign(starsEl.style, { color: "#f39c12", fontSize: font.sizeSm, letterSpacing: "2px", flexShrink: "0" });

    const badge = document.createElement("span");
    badge.textContent = obj.difficulty;
    Object.assign(badge.style, {
      background: `${badgeColor}22`, border: `1px solid ${badgeColor}`,
      borderRadius: "4px", padding: "1px 7px",
      color: badgeColor, fontSize: "10px", fontWeight: "bold", flexShrink: "0",
    });

    topRow.append(titleEl, starsEl, badge);

    // ── Destination + travel time ──
    const destRow = document.createElement("div");
    Object.assign(destRow.style, { display: "flex", gap: spacing.md, flexWrap: "wrap" });

    const dest = this._chip("📍", obj.destination, colors.textMuted);
    const dist = this._chip("📏", obj.distanceKm, colors.textMuted);
    const time = this._chip("⏱", obj.travelTime, colors.textMuted);
    destRow.append(dest, dist, time);

    // ── Mission parameters summary ──
    const paramsRow = document.createElement("div");
    Object.assign(paramsRow.style, { display: "flex", gap: spacing.sm, flexWrap: "wrap" });

    if (obj.radiation > 0)   paramsRow.appendChild(this._chip("☢", `Radiation ${obj.radiation}`, "#e94560"));
    if (obj.heatDanger > 0)  paramsRow.appendChild(this._chip("🔥", `Heat ${obj.heatDanger}`, "#f39c12"));
    paramsRow.appendChild(this._chip("💰", `Budget ${obj.budget}`, "#2ecc71"));
    paramsRow.appendChild(this._chip("🔬", `Science goal ${obj.scienceGoal}`, "#3498db"));
    if (obj.sunlightPct !== 100) paramsRow.appendChild(this._chip("☀", `${obj.sunlightPct}% sunlight`, "#f39c12"));

    // ── Fun fact ──
    const funFact = document.createElement("div");
    Object.assign(funFact.style, {
      color: colors.textMuted, fontSize: "10px", fontStyle: "italic",
      borderLeft: `3px solid ${colors.border}`, paddingLeft: spacing.sm,
    });
    funFact.textContent = `💡 ${obj.funFact}`;

    // ── Star instrument hint ──
    const starHint = document.createElement("div");
    Object.assign(starHint.style, { color: "#f39c12", fontSize: "10px" });
    starHint.textContent = `⭐ Star Instrument: ${obj.starInstrument} (+10 science bonus)`;

    // ── Select button (host only) ──
    const bottomRow = document.createElement("div");
    Object.assign(bottomRow.style, { display: "flex", justifyContent: "flex-end" });

    if (this.isHost) {
      const btn = document.createElement("button");
      btn.textContent = "Select Mission";
      Object.assign(btn.style, {
        background: colors.accent, border: "none", borderRadius: radius.sm,
        color: "#fff", cursor: "pointer", fontFamily: font.family,
        fontSize: font.sizeSm, fontWeight: "bold",
        padding: `${spacing.xs} ${spacing.md}`,
        transition: `background ${transition.fast}`,
      });

      btn.addEventListener("mouseenter", () => { if (!btn.disabled) btn.style.background = Theme.colors.accentHover; });
      btn.addEventListener("mouseleave", () => { if (!btn.disabled) btn.style.background = Theme.colors.accent; });

      btn.addEventListener("click", () => {
        this.container.querySelectorAll("button").forEach((b) => {
          (b as HTMLButtonElement).disabled = true;
          (b as HTMLButtonElement).style.background = colors.disabled;
          (b as HTMLButtonElement).style.cursor = "not-allowed";
        });
        btn.textContent = "Confirming…";
        card.style.borderColor = colors.accent;
        ColyseusService.send("selectObjective", { objectiveId: obj.id });
      });

      bottomRow.appendChild(btn);
    }

    card.append(topRow, destRow, paramsRow, funFact, starHint);
    if (this.isHost) card.appendChild(bottomRow);
    return card;
  }

  private _chip(icon: string, text: string, color: string): HTMLSpanElement {
    const chip = document.createElement("span");
    chip.textContent = `${icon} ${text}`;
    Object.assign(chip.style, {
      color, fontSize: "10px", whiteSpace: "nowrap",
    });
    return chip;
  }
}
