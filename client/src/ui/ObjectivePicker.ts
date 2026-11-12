import { createElement, Rocket, Check, Clock, Star, Sun, ShieldAlert, Flame, Sparkles, Lock, Trophy } from "lucide";
import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";

/**
 * ObjectivePicker
 * ───────────────
 * Pre-flight Campaign Mission Directive Selection for canonical missions (Level 1–6).
 * Renders real mission telemetry with level locks, completion status, and host authorization.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;
  private highestUnlockedLevel: number;
  private errorBanner: HTMLDivElement | null = null;

  constructor(isHost: boolean, highestUnlockedLevel: number = 1) {
    this.isHost = isHost;
    this.highestUnlockedLevel = highestUnlockedLevel;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }

  setUnlockedLevel(level: number): void {
    if (this.highestUnlockedLevel === level) return;
    this.highestUnlockedLevel = level;
    this._rebuild();
  }

  setHost(isHost: boolean): void {
    if (this.isHost === isHost) return;
    this.isHost = isHost;
    this._rebuild();
  }

  private _rebuild(): void {
    const parent = this.container.parentElement;
    this.container.remove();
    this.container = this._buildDOM();
    if (parent) {
      parent.appendChild(this.container);
    }
  }

  showError(message: string): void {
    if (!this.errorBanner) return;
    this.errorBanner.textContent = message;
    this.errorBanner.style.display = "block";
    // Re-enable disabled buttons if host selection failed
    const buttons = this.container.querySelectorAll("button[data-objective-btn]");
    buttons.forEach((btn) => {
      const b = btn as HTMLButtonElement;
      b.disabled = false;
      b.style.opacity = "1";
      b.style.cursor = "pointer";
      const lbl = b.querySelector("[data-btn-label]");
      if (lbl) lbl.textContent = "Select Directive";
    });
  }

  // ── Private ──────────────────────────────────────────────────────────

  private _buildDOM(): HTMLDivElement {
    const { colors, font } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "rgba(8, 10, 16, 0.9)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(15, 19, 29, 0.94)",
      border: `1px solid ${colors.border}`,
      borderRadius: "14px",
      padding: "24px 28px",
      width: "860px",
      maxWidth: "95vw",
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65)",
    });

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
      gap: "12px",
      flexWrap: "wrap",
    });

    const title = document.createElement("h2");
    title.textContent = "NASA Deep Space Flight Directives (M01–M06)";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: "18px",
      fontWeight: "600",
      letterSpacing: "0.3px",
      margin: "0",
    });

    const statusPill = document.createElement("span");
    Object.assign(statusPill.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "11px",
      fontFamily: font.mono,
      color: this.isHost ? colors.accent : colors.textMuted,
      background: colors.surfaceRaised,
      border: `1px solid ${colors.border}`,
      padding: "4px 10px",
      borderRadius: "6px",
    });

    if (this.isHost) {
      statusPill.appendChild(createElement(Rocket, { width: 12, height: 12, "stroke-width": 1.6 }));
      const hostLabel = document.createElement("span");
      hostLabel.textContent = "MISSION COMMANDER";
      statusPill.appendChild(hostLabel);
    } else {
      statusPill.appendChild(createElement(Clock, { width: 12, height: 12, "stroke-width": 1.6 }));
      const waitLabel = document.createElement("span");
      waitLabel.textContent = "AWAITING COMMAND";
      statusPill.appendChild(waitLabel);
    }

    titleRow.append(title, statusPill);

    const subtitle = document.createElement("p");
    subtitle.textContent = this.isHost
      ? "Select a canonical NASA destination mission. Each target has unique sunlight, thermal, radiation, communication, and science requirements."
      : "Mission Commander is choosing the destination and environmental flight profile...";
    Object.assign(subtitle.style, {
      color: colors.textSecondary,
      fontSize: "13px",
      margin: "0",
      lineHeight: "1.45",
    });

    header.append(titleRow, subtitle);

    this.errorBanner = document.createElement("div");
    Object.assign(this.errorBanner.style, {
      display: "none",
      padding: "8px 12px",
      borderRadius: "6px",
      background: "rgba(248, 113, 113, 0.12)",
      border: `1px solid ${colors.danger}`,
      color: colors.danger,
      fontSize: "12px",
    });

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border as string;
    divider.style.margin = "0";

    const cardsContainer = document.createElement("div");
    Object.assign(cardsContainer.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
      gap: "12px",
    });

    OBJECTIVES.forEach((obj) => {
      cardsContainer.appendChild(this._buildCard(obj));
    });

    panel.append(header, this.errorBanner, divider, cardsContainer);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildCard(obj: Objective): HTMLDivElement {
    const { colors, font } = Theme;
    const isUnlocked = obj.level <= this.highestUnlockedLevel;
    const isCompleted = obj.level < this.highestUnlockedLevel;

    const card = document.createElement("div");
    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      background: isUnlocked ? colors.surfaceRaised : "rgba(18, 22, 34, 0.6)",
      border: isUnlocked
        ? (isCompleted ? "1px solid rgba(52, 211, 153, 0.4)" : `1px solid ${colors.border}`)
        : "1px dashed rgba(255, 255, 255, 0.12)",
      borderRadius: "10px",
      padding: "14px 16px",
      gap: "10px",
      justifyContent: "space-between",
      opacity: isUnlocked ? "1" : "0.62",
      transition: "all 0.2s ease",
    });

    const topSection = document.createElement("div");
    Object.assign(topSection.style, { display: "flex", flexDirection: "column", gap: "8px" });

    const topRow = document.createElement("div");
    Object.assign(topRow.style, {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "10px",
    });

    const infoLeft = document.createElement("div");
    Object.assign(infoLeft.style, {
      display: "flex",
      flexDirection: "column",
      gap: "3px",
    });

    const labelRow = document.createElement("div");
    Object.assign(labelRow.style, { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" });

    // Level Badge
    const levelBadge = document.createElement("span");
    levelBadge.textContent = `LEVEL ${obj.level}`;
    Object.assign(levelBadge.style, {
      fontFamily: font.mono,
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.5px",
      color: isUnlocked ? (isCompleted ? colors.success : "#ffffff") : "rgba(255, 255, 255, 0.4)",
      background: isUnlocked
        ? (isCompleted ? "rgba(52, 211, 153, 0.15)" : "rgba(255, 255, 255, 0.1)")
        : "rgba(255, 255, 255, 0.05)",
      border: isUnlocked
        ? (isCompleted ? "1px solid rgba(52, 211, 153, 0.3)" : "1px solid rgba(255, 255, 255, 0.15)")
        : "1px solid rgba(255, 255, 255, 0.08)",
      padding: "2px 7px",
      borderRadius: "4px",
    });

    const idBadge = document.createElement("span");
    idBadge.textContent = obj.id;
    Object.assign(idBadge.style, {
      fontFamily: font.mono,
      fontSize: "10px",
      fontWeight: "600",
      color: isUnlocked ? colors.accent : "rgba(255, 255, 255, 0.4)",
      background: "rgba(56, 189, 248, 0.1)",
      border: "1px solid rgba(56, 189, 248, 0.25)",
      padding: "1px 6px",
      borderRadius: "4px",
    });

    const label = document.createElement("span");
    label.textContent = obj.label;
    Object.assign(label.style, {
      color: isUnlocked ? colors.textPrimary : "rgba(255, 255, 255, 0.5)",
      fontSize: "14px",
      fontWeight: "600",
    });

    labelRow.append(levelBadge, idBadge, label);

    if (isCompleted) {
      const compBadge = document.createElement("span");
      compBadge.textContent = "COMPLETED";
      Object.assign(compBadge.style, {
        fontFamily: font.mono,
        fontSize: "9px",
        fontWeight: "700",
        color: colors.success,
        background: "rgba(52, 211, 153, 0.12)",
        padding: "1px 5px",
        borderRadius: "3px",
      });
      labelRow.appendChild(compBadge);
    } else if (!isUnlocked) {
      const lockBadge = document.createElement("span");
      lockBadge.textContent = "LOCKED";
      Object.assign(lockBadge.style, {
        fontFamily: font.mono,
        fontSize: "9px",
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.4)",
        background: "rgba(255, 255, 255, 0.06)",
        padding: "1px 5px",
        borderRadius: "3px",
      });
      labelRow.appendChild(lockBadge);
    }

    const destLine = document.createElement("div");
    Object.assign(destLine.style, {
      fontSize: "11px",
      color: colors.textSecondary,
      fontFamily: font.mono,
    });
    destLine.textContent = `${obj.destination} · ${obj.distanceKm} · ${obj.travelTime}`;

    infoLeft.append(labelRow, destLine);

    const diffBadge = document.createElement("span");
    diffBadge.textContent = `${obj.difficulty} ${"★".repeat(obj.stars)}`;
    let diffColor: string = colors.success;
    if (obj.difficulty === "Medium") diffColor = colors.accent;
    if (obj.difficulty === "Hard") diffColor = colors.warning;
    if (obj.difficulty === "Expert") diffColor = colors.danger;

    Object.assign(diffBadge.style, {
      fontSize: "10px",
      fontFamily: font.mono,
      fontWeight: "600",
      color: diffColor,
      background: "#080a10",
      border: `1px solid ${colors.border}`,
      padding: "2px 8px",
      borderRadius: "4px",
      whiteSpace: "nowrap",
    });

    topRow.append(infoLeft, diffBadge);

    const desc = document.createElement("p");
    desc.textContent = `${obj.description} ${obj.funFact}`;
    Object.assign(desc.style, {
      color: colors.textSecondary,
      fontSize: "12px",
      lineHeight: "1.45",
      margin: "0",
    });

    // Telemetry constraints strip
    const statsGrid = document.createElement("div");
    Object.assign(statsGrid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "6px",
      padding: "8px 10px",
      background: "rgba(8, 10, 16, 0.55)",
      border: `1px solid ${colors.border}`,
      borderRadius: "6px",
      fontFamily: font.mono,
      fontSize: "10.5px",
      color: colors.textSecondary,
    });

    const statCell = (iconEl: SVGElement, text: string) => {
      const cell = document.createElement("div");
      Object.assign(cell.style, { display: "flex", alignItems: "center", gap: "5px" });
      cell.append(iconEl);
      const span = document.createElement("span");
      span.textContent = text;
      cell.append(span);
      return cell;
    };

    statsGrid.append(
      statCell(createElement(Sun, { width: 11, height: 11, color: colors.warning }), `Sun ${obj.sunlightPct}%`),
      statCell(createElement(Flame, { width: 11, height: 11, color: colors.danger }), `Heat ${obj.heatDanger}`),
      statCell(createElement(ShieldAlert, { width: 11, height: 11, color: colors.accent }), `Rad ${obj.radiation}`),
      statCell(createElement(Sparkles, { width: 11, height: 11, color: colors.success }), `Goal ${obj.scienceGoal} pts`),
      statCell(createElement(Star, { width: 11, height: 11, color: colors.warning }), `${obj.starInstrument}`),
      statCell(createElement(Rocket, { width: 11, height: 11, color: colors.textPrimary }), `Budget ${obj.budget} cr`),
    );

    topSection.append(topRow, desc, statsGrid);
    card.appendChild(topSection);

    if (this.isHost) {
      const actionRow = document.createElement("div");
      Object.assign(actionRow.style, {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "2px",
      });

      const btn = document.createElement("button");
      btn.setAttribute("data-objective-btn", obj.id);
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.gap = "6px";

      const btnLabel = document.createElement("span");
      btnLabel.setAttribute("data-btn-label", "true");

      if (!isUnlocked) {
        btn.disabled = true;
        btn.appendChild(createElement(Lock, { width: 13, height: 13, "stroke-width": 2 }));
        btnLabel.textContent = `Locked (Need Level ${obj.level - 1})`;
        btn.appendChild(btnLabel);

        Object.assign(btn.style, {
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "6px",
          color: "rgba(255, 255, 255, 0.4)",
          fontSize: "11px",
          fontWeight: "500",
          fontFamily: font.family,
          padding: "7px 12px",
          cursor: "not-allowed",
        });
      } else {
        btn.appendChild(createElement(Check, { width: 13, height: 13, "stroke-width": 2 }));
        btnLabel.textContent = isCompleted ? `Replay Level ${obj.level}` : `Deploy Level ${obj.level}`;
        btn.appendChild(btnLabel);

        Object.assign(btn.style, {
          background: isCompleted ? "rgba(52, 211, 153, 0.2)" : colors.accent,
          border: isCompleted ? "1px solid rgba(52, 211, 153, 0.4)" : "none",
          borderRadius: "6px",
          color: isCompleted ? colors.success : "#080a10",
          fontSize: "12px",
          fontWeight: "600",
          fontFamily: font.family,
          padding: "7px 14px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        });

        btn.addEventListener("mouseenter", () => {
          if (!btn.disabled) {
            btn.style.background = isCompleted ? "rgba(52, 211, 153, 0.3)" : colors.accentHover;
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (!btn.disabled) {
            btn.style.background = isCompleted ? "rgba(52, 211, 153, 0.2)" : colors.accent;
          }
        });
        btn.addEventListener("click", () => {
          btn.disabled = true;
          btnLabel.textContent = "Authorizing...";
          btn.style.opacity = "0.7";
          btn.style.cursor = "not-allowed";
          ColyseusService.selectObjective(obj.id);
        });
      }

      actionRow.appendChild(btn);
      card.appendChild(actionRow);
    } else {
      // Non-host crew view: show level status tag
      const statusRow = document.createElement("div");
      Object.assign(statusRow.style, {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "2px",
      });

      const tag = document.createElement("span");
      Object.assign(tag.style, {
        fontSize: "11px",
        fontFamily: font.mono,
        color: isUnlocked ? (isCompleted ? colors.success : colors.accent) : "rgba(255, 255, 255, 0.35)",
      });
      tag.textContent = !isUnlocked
        ? `🔒 Locked (Level ${obj.level})`
        : isCompleted
        ? `✅ Level ${obj.level} Completed`
        : `⭐ Level ${obj.level} Available`;
      statusRow.appendChild(tag);
      card.appendChild(statusRow);
    }

    return card;
  }
}
