import { createElement, Rocket, CheckCircle2, Award, ArrowRight, RotateCcw } from "lucide";
import { Theme } from "../config/theme";
import { Objective, OBJECTIVES } from "../game/data/ObjectiveData";
import { PixelFxAnimator } from "./PixelFxAnimator";
import { SoundFX } from "../audio/SoundEffects";
import { assetUrl } from "../config/basePath";

const PLANET_SPRITES: Record<string, string> = {
  M04: assetUrl("/assets/planets/planet_earth_64.png"),
  M01: assetUrl("/assets/planets/planet_moon_64.png"),
  M02: assetUrl("/assets/planets/planet_mars_64.png"),
  M03: assetUrl("/assets/planets/planet_europa_64.png"),
  M05: assetUrl("/assets/planets/planet_sun_64.png"),
  M06: assetUrl("/assets/planets/planet_titan_64.png"),
};

export class MissionVictoryUI {
  private _container: HTMLDivElement;
  private _objective: Objective;
  private _totalMass: number;
  private _username: string;
  private _isHost: boolean;
  private _onNextMission: (nextObjective: Objective) => void;
  private _onClose: () => void;
  private _confettiFx: PixelFxAnimator | null = null;

  constructor(options: {
    objective: Objective;
    totalMass: number;
    username: string;
    isHost?: boolean;
    onNextMission: (nextObjective: Objective) => void;
    onClose: () => void;
  }) {
    this._objective = options.objective;
    this._totalMass = options.totalMass;
    this._username = options.username;
    this._isHost = options.isHost ?? true;
    this._onNextMission = options.onNextMission;
    this._onClose = options.onClose;

    this._container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this._container);
    this._startConfetti();
    SoundFX.playVictoryFanfare();
  }

  close(): void {
    if (this._confettiFx) {
      this._confettiFx.destroy();
      this._confettiFx = null;
    }
    this._container.remove();
    this._onClose();
  }

  private _startConfetti(): void {
    this._confettiFx = new PixelFxAnimator({
      src: assetUrl("/assets/vfx/confetti.png"),
      frameWidth: 200,
      frameHeight: 140,
      totalFrames: 103,
      columns: 9,
      fps: 30,
      scale: 3,
      loop: true,
      style: {
        position: "absolute",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "3050",
        pointerEvents: "none",
      },
    });
    this._container.appendChild(this._confettiFx.getCanvas());
    this._confettiFx.start();
  }

  private _buildDOM(): HTMLDivElement {
    const { colors, font } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "mission-victory-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(5, 7, 12, 0.94)",
      backdropFilter: "blur(12px)",
      zIndex: "3000",
      fontFamily: font.family,
      animation: "fadeIn 0.3s ease",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: colors.surface,
      border: `1px solid ${colors.success}`,
      borderRadius: "12px",
      padding: "32px 36px",
      width: "520px",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 20px rgba(52, 211, 153, 0.15)",
      textAlign: "center",
      alignItems: "center",
    });

    // Destination Planet Emblem Badge
    const iconBadge = document.createElement("div");
    const planetSrc = PLANET_SPRITES[this._objective.id];
    if (planetSrc) {
      const planetImg = document.createElement("img");
      planetImg.src = planetSrc;
      planetImg.alt = this._objective.destination;
      Object.assign(planetImg.style, {
        width: "48px",
        height: "48px",
        imageRendering: "pixelated",
      });
      iconBadge.appendChild(planetImg);
    } else {
      iconBadge.appendChild(createElement(Award, { width: 32, height: 32, "stroke-width": 1.5, color: colors.success }));
    }
    Object.assign(iconBadge.style, {
      width: "72px",
      height: "72px",
      borderRadius: "50%",
      background: "#0B111E",
      border: `2px solid ${colors.success}`,
      boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    // Titles
    const isFinalLevel = this._objective.level >= OBJECTIVES.length;
    const title = document.createElement("h2");
    title.textContent = isFinalLevel ? "🏆 CAMPAIGN CONQUERED!" : `LEVEL ${this._objective.level} COMPLETE!`;
    Object.assign(title.style, {
      color: colors.success,
      fontSize: "20px",
      fontWeight: "700",
      letterSpacing: "1.5px",
      margin: "0",
    });

    const sub = document.createElement("p");
    sub.textContent = isFinalLevel
      ? "All 6 NASA Deep Space missions successfully engineered and deployed!"
      : `Orbital trajectory achieved for ${this._objective.label} (${this._objective.destination})`;
    Object.assign(sub.style, {
      color: colors.textSecondary,
      fontSize: "13px",
      margin: "0",
    });

    // Telemetry Statistics Box
    const statsBox = document.createElement("div");
    Object.assign(statsBox.style, {
      width: "100%",
      background: colors.surfaceRaised,
      border: `1px solid ${colors.border}`,
      borderRadius: "8px",
      padding: "16px 20px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      textAlign: "left",
    });

    const createStat = (label: string, val: string, color?: string) => {
      const box = document.createElement("div");
      box.innerHTML = `
        <div style="font-size:10px; color:${colors.textMuted}; font-family:${font.mono}; letter-spacing:0.5px;">${label}</div>
        <div style="font-size:14px; color:${color ?? colors.textPrimary}; font-family:${font.mono}; font-weight:600; margin-top:2px;">${val}</div>
      `;
      return box;
    };

    statsBox.append(
      createStat("DESTINATION", `${this._objective.destination}`),
      createStat("LAUNCH MASS", `${this._totalMass} kg`, colors.accent),
      createStat("SCIENCE TARGET", `≥ ${this._objective.scienceGoal} pts`, colors.success),
      createStat("MISSION BUDGET", `${this._objective.budget} cr`),
    );

    // AI Debriefing Message
    const debriefBox = document.createElement("div");
    Object.assign(debriefBox.style, {
      width: "100%",
      background: "rgba(8, 10, 16, 0.6)",
      borderLeft: `3px solid ${colors.accent}`,
      borderRadius: "4px",
      padding: "12px 14px",
      textAlign: "left",
      fontSize: "12px",
      lineHeight: "1.5",
      color: colors.textPrimary,
    });
    debriefBox.innerHTML = `
      <div style="font-size:10px; color:${colors.accent}; font-family:${font.mono}; margin-bottom:4px;">
        MCC-HOUSTON // AI FLIGHT DIRECTOR DEBRIEF
      </div>
      <div>
        All telemetry streams verified. Transponders reporting nominal attitude and telemetry insertion burn.
        The spacecraft is operating at peak orbital parameters. Outstanding engineering execution!
      </div>
    `;

    // Next Mission Logic (Ordered Campaign Sequence)
    const currentIndex = OBJECTIVES.findIndex((o) => o.id === this._objective.id);
    const nextObjective = OBJECTIVES[(currentIndex + 1) % OBJECTIVES.length];

    // Buttons Row
    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex",
      gap: "12px",
      width: "100%",
      marginTop: "8px",
    });

    const nextBtn = document.createElement("button");
    nextBtn.style.display = "flex";
    nextBtn.style.alignItems = "center";
    nextBtn.style.justifyContent = "center";
    nextBtn.style.gap = "8px";
    nextBtn.appendChild(createElement(Rocket, { width: 14, height: 14, "stroke-width": 2 }));
    const nextText = document.createElement("span");
    nextText.textContent = isFinalLevel
      ? `Replay Campaign: Level 1 (${nextObjective.label})`
      : `Deploy Level ${nextObjective.level}: ${nextObjective.label}`;
    nextBtn.appendChild(nextText);
    nextBtn.appendChild(createElement(ArrowRight, { width: 14, height: 14, "stroke-width": 2 }));

    Object.assign(nextBtn.style, {
      flex: "1",
      background: colors.success,
      border: "none",
      borderRadius: "6px",
      color: "#080a10",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: font.family,
      padding: "10px 16px",
      cursor: "pointer",
      transition: "opacity 0.15s ease",
    });
    nextBtn.addEventListener("mouseenter", () => (nextBtn.style.opacity = "0.9"));
    nextBtn.addEventListener("mouseleave", () => (nextBtn.style.opacity = "1"));
    nextBtn.addEventListener("click", () => {
      this.close();
      this._onNextMission(nextObjective);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Review Orbit";
    Object.assign(closeBtn.style, {
      background: colors.surfaceRaised,
      border: `1px solid ${colors.border}`,
      borderRadius: "6px",
      color: colors.textSecondary,
      fontSize: "12px",
      fontFamily: font.family,
      padding: "10px 16px",
      cursor: "pointer",
    });
    closeBtn.addEventListener("click", () => this.close());

    btnRow.append(closeBtn);
    if (this._isHost) {
      btnRow.append(nextBtn);
    }

    card.append(iconBadge, title, sub, statsBox, debriefBox, btnRow);
    overlay.appendChild(card);
    return overlay;
  }
}
