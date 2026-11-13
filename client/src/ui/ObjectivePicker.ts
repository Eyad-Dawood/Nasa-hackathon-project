import {
  createElement,
  Rocket,
  Check,
  Clock,
  Star,
  Sun,
  ShieldAlert,
  Flame,
  Sparkles,
  Lock,
  Compass,
  ArrowRight,
  Globe,
  Radio,
  Lightbulb,
  Award,
} from "lucide";
import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";
import { SoundFX } from "../audio/SoundEffects";

interface PlanetCardTheme {
  accentColor: string;
  secondaryColor: string;
  glowColor: string;
  badge: string;
  sprite: string;
  bgGradient: string;
  ambientHalo: string;
}

const PLANET_CARD_THEMES: Record<string, PlanetCardTheme> = {
  M04: {
    accentColor: "#29ADFF",
    secondaryColor: "#0284C7",
    glowColor: "rgba(41, 173, 255, 0.4)",
    badge: "EARTH LEO",
    sprite: "/assets/planets/planet_earth_64.png",
    bgGradient: "linear-gradient(180deg, rgba(14, 38, 64, 0.95) 0%, rgba(8, 18, 32, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(41, 173, 255, 0.35) 0%, transparent 70%)",
  },
  M01: {
    accentColor: "#E2E8F0",
    secondaryColor: "#94A3B8",
    glowColor: "rgba(226, 232, 240, 0.35)",
    badge: "THE MOON",
    sprite: "/assets/planets/planet_moon_64.png",
    bgGradient: "linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(203, 213, 225, 0.3) 0%, transparent 70%)",
  },
  M02: {
    accentColor: "#F87171",
    secondaryColor: "#EF4444",
    glowColor: "rgba(248, 113, 113, 0.4)",
    badge: "MARS BASE",
    sprite: "/assets/planets/planet_mars_64.png",
    bgGradient: "linear-gradient(180deg, rgba(69, 26, 26, 0.95) 0%, rgba(30, 14, 14, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(239, 68, 68, 0.35) 0%, transparent 70%)",
  },
  M03: {
    accentColor: "#38BDF8",
    secondaryColor: "#0284C7",
    glowColor: "rgba(56, 189, 248, 0.4)",
    badge: "EUROPA / JUPITER",
    sprite: "/assets/planets/planet_europa_64.png",
    bgGradient: "linear-gradient(180deg, rgba(15, 34, 56, 0.95) 0%, rgba(8, 18, 30, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.35) 0%, transparent 70%)",
  },
  M05: {
    accentColor: "#FBBF24",
    secondaryColor: "#F59E0B",
    glowColor: "rgba(251, 191, 36, 0.45)",
    badge: "HELIOS CORONA",
    sprite: "/assets/planets/planet_sun_64.png",
    bgGradient: "linear-gradient(180deg, rgba(64, 42, 10, 0.95) 0%, rgba(28, 18, 4, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.4) 0%, transparent 70%)",
  },
  M06: {
    accentColor: "#34D399",
    secondaryColor: "#10B981",
    glowColor: "rgba(52, 211, 153, 0.4)",
    badge: "TITAN / SATURN",
    sprite: "/assets/planets/planet_titan_64.png",
    bgGradient: "linear-gradient(180deg, rgba(13, 46, 34, 0.95) 0%, rgba(6, 24, 18, 0.98) 100%)",
    ambientHalo: "radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.35) 0%, transparent 70%)",
  },
};

/**
 * ObjectivePicker
 * ───────────────
 * Engaging, colorful, child-friendly Mission Control Center for NASA Space Benders.
 *
 * Displays all 6 canonical missions in an attractive, responsive space-themed card grid:
 * - Each mission card has a prominent, relevant planet illustration & banner at the top.
 * - Mission title, destination badge, and story description underneath the image.
 * - Clear, visual objective icons and specifications (Science Goal, Star Instrument, Budget, Sunlight, Heat, Radiation).
 * - Child-friendly educational "Fun Fact" callout on each card.
 * - Responsive layout adapted to desktop, tablet, and mobile screens.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;
  private highestUnlockedLevel: number;
  private errorBanner: HTMLDivElement | null = null;
  private cardEls: Map<number, HTMLDivElement> = new Map();

  constructor(isHost: boolean, highestUnlockedLevel: number = 1) {
    this.isHost = isHost;
    this.highestUnlockedLevel = highestUnlockedLevel;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.cardEls.clear();
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

  showError(message: string): void {
    if (!this.errorBanner) return;
    this.errorBanner.textContent = message;
    this.errorBanner.style.display = "block";
    const buttons = this.container.querySelectorAll("button[data-objective-btn]");
    buttons.forEach((btn) => {
      const b = btn as HTMLButtonElement;
      b.disabled = false;
      b.style.opacity = "1";
      b.style.cursor = "pointer";
      const lbl = b.querySelector("[data-btn-label]");
      if (lbl) lbl.textContent = "Deploy Mission";
    });
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _rebuild(): void {
    const parent = this.container.parentElement;
    this.destroy();
    this.container = this._buildDOM();
    if (parent) {
      this.mount();
    }
  }

  private _buildDOM(): HTMLDivElement {
    const { font } = Theme;
    this.cardEls.clear();
    this._injectStyles();

    // Fullscreen Overlay with starry space backdrop
    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      flexDirection: "column",
      background: "radial-gradient(circle at 50% 20%, #0F172A 0%, #060911 60%, #030508 100%)",
      zIndex: "1000",
      fontFamily: font.family,
      overflowY: "auto",
      overflowX: "hidden",
      userSelect: "none",
      padding: "20px 24px 48px",
      boxSizing: "border-box",
    });

    // ── Header Section ──
    const headerWrapper = document.createElement("div");
    headerWrapper.className = "mission-header-bar";
    Object.assign(headerWrapper.style, {
      width: "100%",
      maxWidth: "1280px",
      margin: "0 auto 28px",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      padding: "16px 24px",
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "18px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
    });

    // Left Title Box
    const titleBox = document.createElement("div");
    Object.assign(titleBox.style, {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    });

    const logoBadge = document.createElement("div");
    Object.assign(logoBadge.style, {
      width: "48px",
      height: "48px",
      borderRadius: "14px",
      background: "linear-gradient(135deg, #29ADFF 0%, #0284C7 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(41, 173, 255, 0.4)",
    });
    logoBadge.appendChild(createElement(Rocket, { width: 26, height: 26, color: "#ffffff", "stroke-width": 2 }));

    const titleText = document.createElement("div");
    titleText.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:0.4px;">NASA Mission Control</span>
        <span style="background:rgba(41, 173, 255, 0.2); color:#38BDF8; font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; font-family:'JetBrains Mono', monospace;">SPACE BENDERS</span>
      </div>
      <div style="font-size:13px; color:rgba(255,255,255,0.7); margin-top:3px;">
        Select an expedition, build your custom spacecraft, and launch into the cosmos!
      </div>
    `;
    titleBox.append(logoBadge, titleText);

    // Right Controls / Badges Box
    const rightBox = document.createElement("div");
    Object.assign(rightBox.style, {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
    });

    // Test Mode indicator (if level >= 6)
    if (this.highestUnlockedLevel >= 6) {
      const testBadge = document.createElement("div");
      Object.assign(testBadge.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "700",
        color: "#FBBF24",
        background: "rgba(245, 158, 11, 0.15)",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        padding: "6px 14px",
        borderRadius: "10px",
      });
      testBadge.innerHTML = `<span>★ ALL 6 MISSIONS UNLOCKED</span>`;
      rightBox.appendChild(testBadge);
    }

    // Role / Commander Status Badge
    const roleBadge = document.createElement("div");
    Object.assign(roleBadge.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "12px",
      fontWeight: "700",
      fontFamily: "'JetBrains Mono', monospace",
      color: this.isHost ? "#29ADFF" : "rgba(255, 255, 255, 0.75)",
      background: this.isHost ? "rgba(41, 173, 255, 0.12)" : "rgba(255, 255, 255, 0.06)",
      border: `1px solid ${this.isHost ? "rgba(41, 173, 255, 0.35)" : "rgba(255, 255, 255, 0.12)"}`,
      padding: "8px 16px",
      borderRadius: "10px",
    });

    if (this.isHost) {
      roleBadge.appendChild(createElement(Award, { width: 16, height: 16, color: "#29ADFF" }));
      const span = document.createElement("span");
      span.textContent = "COMMANDER: CHOOSE MISSION";
      roleBadge.appendChild(span);
    } else {
      roleBadge.appendChild(createElement(Clock, { width: 16, height: 16, color: "#34D399" }));
      const span = document.createElement("span");
      span.textContent = "CREW: WAITING FOR COMMANDER";
      roleBadge.appendChild(span);
    }

    rightBox.appendChild(roleBadge);
    headerWrapper.append(titleBox, rightBox);

    // ── Error Banner ──
    this.errorBanner = document.createElement("div");
    Object.assign(this.errorBanner.style, {
      width: "100%",
      maxWidth: "1280px",
      margin: "0 auto 16px",
      display: "none",
      padding: "10px 20px",
      borderRadius: "10px",
      background: "rgba(239, 68, 68, 0.2)",
      border: "1px solid #EF4444",
      color: "#FCA5A5",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "'JetBrains Mono', monospace",
      textAlign: "center",
    });

    // ── Responsive Mission Cards Grid ──
    const cardsGrid = document.createElement("div");
    cardsGrid.className = "mission-cards-grid";
    Object.assign(cardsGrid.style, {
      width: "100%",
      maxWidth: "1280px",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
      gap: "24px",
      alignItems: "stretch",
    });

    // Render cards for all canonical missions
    OBJECTIVES.forEach((obj) => {
      const card = this._buildMissionCard(obj);
      this.cardEls.set(obj.level, card);
      cardsGrid.appendChild(card);
    });

    overlay.append(headerWrapper, this.errorBanner, cardsGrid);
    return overlay;
  }

  /**
   * Builds an attractive, child-friendly Mission Card with:
   * 1. Relevant visual planet illustration & banner at the top
   * 2. Mission title and description underneath the image
   * 3. Additional mission details, specifications, and objectives
   * 4. Educational Fun Fact callout
   * 5. Interactive action button with child-friendly feedback
   */
  private _buildMissionCard(obj: Objective): HTMLDivElement {
    const isTestingAll = this.highestUnlockedLevel >= 6;
    const isUnlocked = isTestingAll || obj.level <= this.highestUnlockedLevel;
    const isCompleted = !isTestingAll && obj.level < this.highestUnlockedLevel;
    const isCurrentActive = isTestingAll ? true : obj.level === this.highestUnlockedLevel;
    const theme = PLANET_CARD_THEMES[obj.id] ?? PLANET_CARD_THEMES.M04;

    const card = document.createElement("div");
    card.className = "mission-card-item";
    card.setAttribute("data-level", String(obj.level));
    card.setAttribute("data-mission-id", obj.id);

    Object.assign(card.style, {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      background: theme.bgGradient,
      borderRadius: "20px",
      border: isCurrentActive
        ? `2px solid ${theme.accentColor}`
        : isCompleted
        ? "1.5px solid #10B981"
        : isUnlocked
        ? "1.5px solid rgba(255, 255, 255, 0.15)"
        : "1px dashed rgba(255, 255, 255, 0.12)",
      boxShadow: isCurrentActive
        ? `0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px ${theme.glowColor}`
        : "0 10px 28px rgba(0, 0, 0, 0.4)",
      overflow: "hidden",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      opacity: isUnlocked ? "1" : "0.6",
    });

    card.addEventListener("mouseenter", () => {
      if (isUnlocked) {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = `0 20px 48px rgba(0, 0, 0, 0.7), 0 0 32px ${theme.glowColor}`;
      }
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = isCurrentActive
        ? `0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px ${theme.glowColor}`
        : "0 10px 28px rgba(0, 0, 0, 0.4)";
    });

    // ── 1. Top Image Banner (Relevant Mission Image at the Top) ──
    const imageBanner = document.createElement("div");
    imageBanner.className = "mission-banner-visual";
    Object.assign(imageBanner.style, {
      position: "relative",
      width: "100%",
      height: "170px",
      background: theme.ambientHalo,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    });

    // Background cosmic orbit lines (SVG)
    const orbitSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    orbitSvg.setAttribute("viewBox", "0 0 300 170");
    Object.assign(orbitSvg.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      opacity: "0.4",
    });
    orbitSvg.innerHTML = `
      <ellipse cx="150" cy="85" rx="110" ry="45" fill="none" stroke="${theme.accentColor}" stroke-width="1.2" stroke-dasharray="4 6" />
      <ellipse cx="150" cy="85" rx="135" ry="60" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.8" />
    `;
    imageBanner.appendChild(orbitSvg);

    // Central Pixel-Art Planet Sprite (Large, crisp, prominent)
    const planetImg = document.createElement("img");
    planetImg.src = theme.sprite;
    planetImg.alt = obj.destination;
    planetImg.className = "mission-planet-img";
    Object.assign(planetImg.style, {
      width: "72px",
      height: "72px",
      imageRendering: "pixelated",
      zIndex: "2",
      filter: isUnlocked
        ? `drop-shadow(0 0 16px ${theme.glowColor})`
        : "grayscale(0.9) opacity(0.5)",
      transition: "transform 0.3s ease",
    });
    imageBanner.appendChild(planetImg);

    // Top-Left Badge: Level Pill
    const levelBadge = document.createElement("div");
    Object.assign(levelBadge.style, {
      position: "absolute",
      top: "14px",
      left: "14px",
      zIndex: "3",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "8px",
      background: isCurrentActive ? theme.accentColor : "rgba(15, 23, 42, 0.8)",
      color: isCurrentActive ? "#04060A" : "#FFFFFF",
      border: `1px solid ${isCurrentActive ? "transparent" : "rgba(255, 255, 255, 0.15)"}`,
      fontSize: "11px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5px",
    });
    levelBadge.textContent = `MISSION ${obj.level}`;
    imageBanner.appendChild(levelBadge);

    // Top-Right Badge: Difficulty Stars & Status
    const topStatusBadge = document.createElement("div");
    Object.assign(topStatusBadge.style, {
      position: "absolute",
      top: "14px",
      right: "14px",
      zIndex: "3",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "8px",
      background: "rgba(15, 23, 42, 0.85)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(8px)",
    });

    if (isCompleted) {
      topStatusBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
      topStatusBadge.style.color = "#34D399";
      topStatusBadge.innerHTML = `<span style="font-size:10px; font-weight:800; font-family:'JetBrains Mono', monospace;">✓ COMPLETED</span>`;
    } else if (!isUnlocked) {
      topStatusBadge.style.color = "rgba(255, 255, 255, 0.4)";
      topStatusBadge.appendChild(createElement(Lock, { width: 12, height: 12 }));
      const lockText = document.createElement("span");
      lockText.textContent = "LOCKED";
      lockText.style.fontSize = "10px";
      lockText.style.fontWeight = "800";
      lockText.style.fontFamily = "'JetBrains Mono', monospace";
      topStatusBadge.appendChild(lockText);
    } else {
      // Show difficulty stars
      const starsWrap = document.createElement("div");
      Object.assign(starsWrap.style, { display: "flex", alignItems: "center", gap: "2px" });
      for (let s = 0; s < obj.stars; s++) {
        starsWrap.appendChild(createElement(Star, { width: 11, height: 11, color: "#FBBF24", fill: "#FBBF24" }));
      }
      const diffLabel = document.createElement("span");
      diffLabel.textContent = obj.difficulty;
      Object.assign(diffLabel.style, {
        fontSize: "10px",
        fontWeight: "700",
        color: "#FBBF24",
        fontFamily: "'JetBrains Mono', monospace",
        marginLeft: "4px",
      });
      topStatusBadge.append(starsWrap, diffLabel);
    }
    imageBanner.appendChild(topStatusBadge);

    // Bottom Banner Info Tag: Destination & Travel Time
    const destTag = document.createElement("div");
    Object.assign(destTag.style, {
      position: "absolute",
      bottom: "10px",
      left: "14px",
      zIndex: "3",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "11px",
      fontWeight: "700",
      color: theme.accentColor,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.4px",
    });
    destTag.innerHTML = `<span>📍 ${obj.destination.toUpperCase()}</span> <span style="color:rgba(255,255,255,0.4)">•</span> <span style="color:rgba(255,255,255,0.7); font-weight:500;">${obj.distanceKm}</span>`;
    imageBanner.appendChild(destTag);

    // ── 2. Card Content (Title, Description, Objectives, Fun Fact) ──
    const cardBody = document.createElement("div");
    Object.assign(cardBody.style, {
      display: "flex",
      flexDirection: "column",
      padding: "18px 20px 20px",
      flex: "1",
      gap: "14px",
    });

    // Mission Title & Story Description
    const titleGroup = document.createElement("div");
    titleGroup.innerHTML = `
      <h3 style="font-size:18px; font-weight:800; color:#FFFFFF; margin:0 0 6px 0; letter-spacing:0.2px; line-height:1.2;">
        ${obj.label}
      </h3>
      <p style="font-size:13px; color:rgba(255, 255, 255, 0.78); margin:0; line-height:1.45;">
        ${obj.description}
      </p>
    `;

    // ── 3. Additional Mission Details & Objectives Grid ──
    const specGrid = document.createElement("div");
    Object.assign(specGrid.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
      background: "rgba(0, 0, 0, 0.25)",
      borderRadius: "12px",
      padding: "10px 12px",
      border: "1px solid rgba(255, 255, 255, 0.06)",
    });

    const createSpecPill = (icon: Node, label: string, value: string, color: string) => {
      const pill = document.createElement("div");
      Object.assign(pill.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
      });
      pill.appendChild(icon);
      const textWrap = document.createElement("div");
      textWrap.innerHTML = `
        <span style="color:rgba(255, 255, 255, 0.45); font-size:9.5px; display:block; line-height:1;">${label}</span>
        <span style="color:${color}; font-weight:700; font-size:11px; line-height:1.3;">${value}</span>
      `;
      pill.appendChild(textWrap);
      return pill;
    };

    specGrid.append(
      createSpecPill(createElement(Sparkles, { width: 13, height: 13, color: "#34D399" }), "SCIENCE GOAL", `${obj.scienceGoal} pts`, "#34D399"),
      createSpecPill(createElement(Compass, { width: 13, height: 13, color: "#A78BFA" }), "MISSION BUDGET", `$${obj.budget}M`, "#A78BFA"),
      createSpecPill(createElement(Sun, { width: 13, height: 13, color: "#FBBF24" }), "SUNLIGHT", `${obj.sunlightPct}%`, "#FBBF24"),
      createSpecPill(createElement(ShieldAlert, { width: 13, height: 13, color: "#38BDF8" }), "RADIATION", `Tier ${obj.radiation}`, "#38BDF8"),
      createSpecPill(createElement(Flame, { width: 13, height: 13, color: "#F87171" }), "HEAT DANGER", `Tier ${obj.heatDanger}`, "#F87171"),
      createSpecPill(createElement(Clock, { width: 13, height: 13, color: "#CBD5E1" }), "TRAVEL TIME", obj.travelTime, "#CBD5E1"),
    );

    // Star Instrument Bonus Callout
    const starCallout = document.createElement("div");
    Object.assign(starCallout.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "rgba(251, 191, 36, 0.08)",
      border: "1px solid rgba(251, 191, 36, 0.25)",
      borderRadius: "10px",
      padding: "8px 12px",
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.85)",
    });
    starCallout.appendChild(createElement(Star, { width: 14, height: 14, color: "#FBBF24", fill: "#FBBF24" }));
    const starText = document.createElement("span");
    starText.innerHTML = `<strong>Star Payload:</strong> <span style="color:#FDE68A;">${obj.starInstrument}</span> (+10 bonus science!)`;
    starCallout.appendChild(starText);

    // Child-Friendly Fun Fact Callout Box
    const funFactBox = document.createElement("div");
    Object.assign(funFactBox.style, {
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      background: "rgba(41, 173, 255, 0.07)",
      border: "1px solid rgba(41, 173, 255, 0.2)",
      borderRadius: "10px",
      padding: "8px 12px",
      fontSize: "11.5px",
      color: "rgba(255, 255, 255, 0.85)",
      lineHeight: "1.4",
      marginTop: "auto",
    });
    funFactBox.appendChild(createElement(Lightbulb, { width: 14, height: 14, color: "#38BDF8", style: "flex-shrink:0; margin-top:1px;" }));
    const factText = document.createElement("span");
    factText.innerHTML = `<strong style="color:#38BDF8;">Did You Know?</strong> ${obj.funFact}`;
    funFactBox.appendChild(factText);

    // ── 4. Action Button / Launch Status ──
    const actionWrapper = document.createElement("div");
    Object.assign(actionWrapper.style, {
      marginTop: "8px",
    });

    if (this.isHost) {
      const btn = document.createElement("button");
      btn.setAttribute("data-objective-btn", obj.id);
      Object.assign(btn.style, {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "12px 18px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "800",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.5px",
        cursor: isUnlocked ? "pointer" : "not-allowed",
        border: "none",
        transition: "all 0.15s ease",
      });

      const btnLabel = document.createElement("span");
      btnLabel.setAttribute("data-btn-label", "true");

      if (!isUnlocked) {
        btn.disabled = true;
        btn.style.background = "rgba(255, 255, 255, 0.06)";
        btn.style.color = "rgba(255, 255, 255, 0.35)";
        btn.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        btn.appendChild(createElement(Lock, { width: 14, height: 14 }));
        btnLabel.textContent = `COMPLETE MISSION ${obj.level - 1} FIRST`;
        btn.appendChild(btnLabel);
      } else {
        const isReplay = isCompleted && !isTestingAll;
        btn.style.background = isReplay
          ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
          : `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryColor} 100%)`;
        btn.style.color = isReplay ? "#FFFFFF" : "#040810";
        btn.style.boxShadow = `0 4px 18px ${theme.glowColor}`;

        btn.appendChild(createElement(Rocket, { width: 16, height: 16, "stroke-width": 2.2 }));
        btnLabel.textContent = isReplay ? `REPLAY MISSION ${obj.level}` : `LAUNCH MISSION ${obj.level}`;
        btn.appendChild(btnLabel);

        btn.addEventListener("mouseenter", () => {
          btn.style.transform = "scale(1.02)";
          btn.style.filter = "brightness(1.1)";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.transform = "scale(1)";
          btn.style.filter = "brightness(1)";
        });
        btn.addEventListener("click", () => {
          SoundFX.playClick();
          btn.disabled = true;
          btnLabel.textContent = "TRANSMITTING FLIGHT VECTOR...";
          btn.style.opacity = "0.7";
          btn.style.cursor = "not-allowed";
          ColyseusService.selectObjective(obj.id);
        });
      }

      actionWrapper.appendChild(btn);
    } else {
      // Crew view
      const statusBox = document.createElement("div");
      Object.assign(statusBox.style, {
        width: "100%",
        padding: "10px 16px",
        borderRadius: "10px",
        fontSize: "12px",
        fontWeight: "700",
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: "center",
        background: isCurrentActive
          ? "rgba(41, 173, 255, 0.12)"
          : isCompleted
          ? "rgba(16, 185, 129, 0.12)"
          : "rgba(255, 255, 255, 0.05)",
        color: isCurrentActive ? "#38BDF8" : isCompleted ? "#34D399" : "rgba(255, 255, 255, 0.4)",
        border: `1px solid ${isCurrentActive ? "rgba(41, 173, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
      });
      statusBox.textContent = !isUnlocked
        ? `LOCKED // COMPLETE MISSION ${obj.level - 1}`
        : isCompleted
        ? `MISSION ${obj.level} CLEARED`
        : `READY FOR COMMANDER'S LAUNCH ORDER`;
      actionWrapper.appendChild(statusBox);
    }

    cardBody.append(titleGroup, specGrid, starCallout, funFactBox, actionWrapper);
    card.append(imageBanner, cardBody);
    return card;
  }

  private _injectStyles(): void {
    if (document.getElementById("mission-screen-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "mission-screen-styles";
    styleEl.textContent = `
      #objective-picker-overlay::-webkit-scrollbar {
        width: 8px;
      }
      #objective-picker-overlay::-webkit-scrollbar-track {
        background: rgba(3, 5, 8, 0.8);
      }
      #objective-picker-overlay::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }
      #objective-picker-overlay::-webkit-scrollbar-thumb:hover {
        background: #29ADFF;
      }

      @keyframes planetFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(2deg); }
      }

      .mission-card-item:hover .mission-planet-img {
        animation: planetFloat 2.5s ease-in-out infinite;
      }

      @media (max-width: 768px) {
        .mission-header-bar {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
        }
        .mission-cards-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
