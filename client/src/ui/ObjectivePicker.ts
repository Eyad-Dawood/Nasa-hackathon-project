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
  ChevronLeft,
  ChevronRight,
  Activity,
  Globe,
} from "lucide";
import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";
import { assetUrl } from "../config/basePath";

/**
 * Generates an organic flared ribbon SVG path connecting level stage portals.
 * Uses cubic bezier tangents and flared fillets from Thinker PipelineRibbon.
 */
function generateRibbonPath(
  start: { x: number; y: number; dx: number; dy: number },
  end: { x: number; y: number; dx: number; dy: number },
  filletRadius: number = 26,
  baseHalfWidth: number = 3.5,
): { ribbonPath: string; centerCurve: string } {
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  if (dist < 10) return { ribbonPath: "", centerCurve: "" };

  const controlDist = 0.48 * dist;
  const p1 = { x: start.x + start.dx * controlDist, y: start.y + start.dy * controlDist };
  const p2 = { x: end.x + end.dx * controlDist, y: end.y + end.dy * controlDist };

  const centerCurve = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;

  const points: { x: number; y: number; nx: number; ny: number; distance: number }[] = [];
  let totalLength = 0;
  const SAMPLES = 60;

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const invT = 1 - t;

    // Cubic bezier position
    const x =
      invT ** 3 * start.x +
      3 * invT ** 2 * t * p1.x +
      3 * invT * t ** 2 * p2.x +
      t ** 3 * end.x;
    const y =
      invT ** 3 * start.y +
      3 * invT ** 2 * t * p1.y +
      3 * invT * t ** 2 * p2.y +
      t ** 3 * end.y;

    // Tangent derivative along cubic bezier
    const dx =
      3 * invT ** 2 * (p1.x - start.x) +
      6 * invT * t * (p2.x - p1.x) +
      3 * t ** 2 * (end.x - p2.x);
    const dy =
      3 * invT ** 2 * (p1.y - start.y) +
      6 * invT * t * (p2.y - p1.y) +
      3 * t ** 2 * (end.y - p2.y);
    const tanLen = Math.hypot(dx, dy) || 1;

    const prev = points[i - 1];
    if (prev) {
      totalLength += Math.hypot(x - prev.x, y - prev.y);
    }

    points.push({
      x,
      y,
      nx: -dy / tanLen,
      ny: dx / tanLen,
      distance: totalLength,
    });
  }

  const fillet = Math.min(filletRadius, totalLength / 4);
  const flare = (d: number) => {
    const diff = Math.max(0, fillet - d);
    return fillet - Math.sqrt(Math.max(0, fillet ** 2 - diff ** 2));
  };

  const edge = (direction: number) => {
    return points.map((p) => {
      const hw = baseHalfWidth + flare(p.distance) + flare(totalLength - p.distance);
      const px = (p.x + p.nx * hw * direction).toFixed(1);
      const py = (p.y + p.ny * hw * direction).toFixed(1);
      return `${px} ${py}`;
    });
  };

  const ribbonPath = `M ${edge(1).join(" L ")} L ${edge(-1).reverse().join(" L ")} Z`;
  return { ribbonPath, centerCurve };
}

interface PlanetStyle {
  accentColor: string;
  borderColor: string;
  badge: string;
  sprite: string;
}

const PLANET_STYLES: Record<string, PlanetStyle> = {
  M04: {
    accentColor: "#29ADFF",
    borderColor: "#38BDF8",
    badge: "EARTH LEO",
    sprite: assetUrl("/assets/planets/planet_earth_64.png"),
  },
  M01: {
    accentColor: "#CBD5E1",
    borderColor: "#94A3B8",
    badge: "THE MOON",
    sprite: assetUrl("/assets/planets/planet_moon_64.png"),
  },
  M02: {
    accentColor: "#F87171",
    borderColor: "#EF4444",
    badge: "MARS BASE",
    sprite: assetUrl("/assets/planets/planet_mars_64.png"),
  },
  M03: {
    accentColor: "#38BDF8",
    borderColor: "#0284C7",
    badge: "EUROPA / JUPITER",
    sprite: assetUrl("/assets/planets/planet_europa_64.png"),
  },
  M05: {
    accentColor: "#FBBF24",
    borderColor: "#F59E0B",
    badge: "HELIOS CORONA",
    sprite: assetUrl("/assets/planets/planet_sun_64.png"),
  },
  M06: {
    accentColor: "#34D399",
    borderColor: "#10B981",
    badge: "TITAN / SATURN",
    sprite: assetUrl("/assets/planets/planet_titan_64.png"),
  },
};

/**
 * ObjectivePicker
 * ───────────────
 * Full-screen Horizontal S-Curve Pipeline Ribbon Campaign Map.
 * Players scroll/drag horizontally through space across a zigzagging
 * pipeline connecting Level 1 to Level 6 with Liquid Glass planetary
 * hubs and animated energy pulses.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;
  private highestUnlockedLevel: number;
  private errorBanner: HTMLDivElement | null = null;
  private scrollViewport!: HTMLDivElement;
  private worldTrack!: HTMLDivElement;
  private svgLayer!: SVGSVGElement;
  private resizeObserver: ResizeObserver | null = null;
  private animFrameId: number | null = null;
  private portalEls: Map<number, HTMLDivElement> = new Map();

  constructor(isHost: boolean, highestUnlockedLevel: number = 1) {
    this.isHost = isHost;
    this.highestUnlockedLevel = highestUnlockedLevel;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
    this._setupPipelineRibbons();
    this._setupDragScroll();
    this._scrollToActiveLevel();
  }

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.portalEls.clear();
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
      if (lbl) lbl.textContent = "Deploy Vector";
    });
  }

  // ── Private ──────────────────────────────────────────────────────────

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
    this.portalEls.clear();
    this._injectStyles();

    // Fullscreen Overlay
    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      flexDirection: "column",
      background: "#05080E",
      zIndex: "1000",
      fontFamily: font.family,
      overflow: "hidden",
      userSelect: "none",
    });

    // ── Floating Top HUD Bar (Liquid Glass) ──
    const topBar = document.createElement("div");
    Object.assign(topBar.style, {
      position: "absolute",
      top: "16px",
      left: "20px",
      right: "20px",
      zIndex: "30",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 20px",
      background: "rgba(10, 14, 24, 0.75)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 20px 40px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(20px) saturate(1.5)",
      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
      borderRadius: "14px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      pointerEvents: "auto",
    });

    const leftBox = document.createElement("div");
    Object.assign(leftBox.style, { display: "flex", alignItems: "center", gap: "12px" });

    const beacon = document.createElement("div");
    Object.assign(beacon.style, {
      width: "8px",
      height: "8px",
      background: "#29ADFF",
      borderRadius: "2px",
    });

    const titleText = document.createElement("div");
    titleText.innerHTML = `
      <div style="font-size:14px; font-weight:700; color:#ffffff; font-family:'JetBrains Mono', monospace; letter-spacing:0.8px;">
        NASA CAMPAIGN // FLIGHT TRAJECTORY PIPELINE
      </div>
      <div style="font-size:11px; color:rgba(255,255,255,0.5); font-family:'JetBrains Mono', monospace; margin-top:2px;">
        ← DRAG OR SCROLL HORIZONTALLY TO TRAVERSE MISSIONS →
      </div>
    `;

    leftBox.append(beacon, titleText);

    // Right Controls
    const rightBox = document.createElement("div");
    Object.assign(rightBox.style, { display: "flex", alignItems: "center", gap: "12px" });

    // Developer Test Mode Badge (shown when all 6 campaign levels are unlocked)
    if (this.highestUnlockedLevel >= 6) {
      const testBadge = document.createElement("div");
      Object.assign(testBadge.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "10.5px",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: "700",
        color: "#FBBF24",
        background: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        padding: "5px 12px",
        borderRadius: "8px",
        letterSpacing: "0.5px",
      });
      testBadge.innerHTML = `<span>TEST MODE: ALL 6 LEVELS UNLOCKED</span>`;
      rightBox.appendChild(testBadge);
    }

    // Quick Level Navigator Pill
    const navPill = document.createElement("div");
    Object.assign(navPill.style, {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      background: "rgba(255, 255, 255, 0.05)",
      borderRadius: "8px",
      padding: "4px 8px",
      border: "1px solid rgba(255, 255, 255, 0.08)",
    });

    for (let lvl = 1; lvl <= 6; lvl++) {
      const dot = document.createElement("button");
      dot.textContent = `L${lvl}`;
      const isLvlUnlocked = lvl <= this.highestUnlockedLevel;
      const isLvlActive = lvl === this.highestUnlockedLevel;

      Object.assign(dot.style, {
        background: isLvlActive
          ? "#29ADFF"
          : isLvlUnlocked
          ? "rgba(52, 211, 153, 0.25)"
          : "transparent",
        color: isLvlActive ? "#04060A" : isLvlUnlocked ? "#34D399" : "rgba(255, 255, 255, 0.3)",
        border: "none",
        borderRadius: "4px",
        padding: "3px 8px",
        fontSize: "10px",
        fontWeight: "700",
        fontFamily: "'JetBrains Mono', monospace",
        cursor: "pointer",
        transition: "all 0.15s ease",
      });

      dot.addEventListener("click", () => {
        const portal = this.portalEls.get(lvl);
        if (portal && this.scrollViewport) {
          const rect = portal.getBoundingClientRect();
          const target = this.scrollViewport.scrollLeft + rect.left - window.innerWidth / 2 + rect.width / 2;
          this.scrollViewport.scrollTo({ left: target, behavior: "smooth" });
        }
      });
      navPill.appendChild(dot);
    }

    // Host status badge
    const roleBadge = document.createElement("div");
    Object.assign(roleBadge.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      color: this.isHost ? "#29ADFF" : "rgba(255, 255, 255, 0.6)",
      background: "rgba(255, 255, 255, 0.06)",
      padding: "6px 14px",
      borderRadius: "8px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    });
    if (this.isHost) {
      roleBadge.appendChild(createElement(Rocket, { width: 13, height: 13, "stroke-width": 1.6 }));
      const span = document.createElement("span");
      span.textContent = "COMMANDER // AUTHORIZED";
      roleBadge.appendChild(span);
    } else {
      roleBadge.appendChild(createElement(Clock, { width: 13, height: 13, "stroke-width": 1.6 }));
      const span = document.createElement("span");
      span.textContent = "CREW // AWAITING COMMAND";
      roleBadge.appendChild(span);
    }

    rightBox.append(navPill, roleBadge);
    topBar.append(leftBox, rightBox);

    // Error banner
    this.errorBanner = document.createElement("div");
    Object.assign(this.errorBanner.style, {
      position: "absolute",
      top: "84px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "40",
      display: "none",
      padding: "8px 18px",
      borderRadius: "8px",
      background: "rgba(255, 0, 77, 0.2)",
      border: "1px solid #FF004D",
      color: "#FF004D",
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
    });

    // ── Horizontal Scroll Viewport ──
    this.scrollViewport = document.createElement("div");
    this.scrollViewport.id = "pipeline-scroll-viewport";
    Object.assign(this.scrollViewport.style, {
      position: "relative",
      width: "100%",
      height: "100%",
      overflowX: "auto",
      overflowY: "hidden",
      cursor: "grab",
      scrollBehavior: "smooth",
    });

    // Cosmic 2D Tactical World Track: 2700px wide with subtle 2D grid
    this.worldTrack = document.createElement("div");
    this.worldTrack.id = "pipeline-world-track";
    Object.assign(this.worldTrack.style, {
      position: "relative",
      width: "2700px",
      minHeight: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      backgroundColor: "#060911",
      backgroundImage: `
        linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
      `,
      backgroundSize: "48px 48px",
    });

    // SVG 2D Pipeline Ribbon Canvas (Clean Vector Strokes, No Blurry Glow Filter)
    this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgLayer.setAttribute("class", "pipeline-ribbon-canvas");
    Object.assign(this.svgLayer.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1",
    });

    this.svgLayer.innerHTML = `
      <defs>
        <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" />
        </pattern>
      </defs>
      <g id="ribbon-paths-group"></g>
    `;

    // ── Generate the Zigzag Nodes across Space ──
    // Shifted down comfortably to give 2D breathing room from the top bar:
    // Even levels (upper nodes): yPct = 44% (gives ~350px clearance below top bar)
    // Odd levels (lower nodes):  yPct = 62% (gives comfortable clearance above bottom)
    const ZIGZAG_COORDS = [
      { level: 1, x: 240, yPct: 62 },
      { level: 2, x: 680, yPct: 44 },
      { level: 3, x: 1120, yPct: 62 },
      { level: 4, x: 1560, yPct: 44 },
      { level: 5, x: 2000, yPct: 62 },
      { level: 6, x: 2440, yPct: 44 },
    ];

    OBJECTIVES.forEach((obj) => {
      const coord = ZIGZAG_COORDS.find((c) => c.level === obj.level) ?? {
        level: obj.level,
        x: 200 + (obj.level - 1) * 420,
        yPct: obj.level % 2 === 1 ? 55 : 35,
      };

      const stageStation = this._buildStageStation(obj, coord);
      this.portalEls.set(obj.level, stageStation);
      this.worldTrack.appendChild(stageStation);
    });

    this.worldTrack.appendChild(this.svgLayer);
    this.scrollViewport.appendChild(this.worldTrack);
    overlay.append(topBar, this.errorBanner, this.scrollViewport);
    return overlay;
  }

  /**
   * Builds a crisp 2D game stage station node (Tactical Sector Node + Attached Mission Dossier)
   */
  private _buildStageStation(
    obj: Objective,
    coord: { level: number; x: number; yPct: number },
  ): HTMLDivElement {
    const isTestingAll = this.highestUnlockedLevel >= 6;
    const isUnlocked = isTestingAll || obj.level <= this.highestUnlockedLevel;
    const isCompleted = !isTestingAll && obj.level < this.highestUnlockedLevel;
    const isCurrentActive = isTestingAll ? true : obj.level === this.highestUnlockedLevel;
    const style = PLANET_STYLES[obj.id] ?? PLANET_STYLES.M04;

    const stationWrapper = document.createElement("div");
    stationWrapper.id = `level-station-${obj.level}`;
    stationWrapper.setAttribute("data-level", String(obj.level));

    Object.assign(stationWrapper.style, {
      position: "absolute",
      left: `${coord.x}px`,
      top: `${coord.yPct}%`,
      transform: "translateY(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      zIndex: "10",
      width: "280px",
      pointerEvents: "auto",
    });

    // ── Crisp 2D Tactical Stage Node with Pixel Art Planet Sprite ──
    const portalHub = document.createElement("div");
    portalHub.className = "stage-portal-hub";
    Object.assign(portalHub.style, {
      width: "74px",
      height: "74px",
      borderRadius: "50%",
      background: isUnlocked ? "#0B111E" : "#080C14",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      border: isCurrentActive
        ? `2px solid ${style.borderColor}`
        : isCompleted
        ? "2px solid #10B981"
        : "1.5px dashed rgba(255, 255, 255, 0.15)",
      outline: isCurrentActive ? "2px dashed rgba(56, 189, 248, 0.45)" : "none",
      outlineOffset: "4px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      position: "relative",
      transition: "all 0.15s ease",
      padding: "2px",
    });

    // Top Level Pill Tag
    const lvlTag = document.createElement("div");
    lvlTag.textContent = `LVL ${obj.level}`;
    Object.assign(lvlTag.style, {
      fontSize: "8.5px",
      fontWeight: "800",
      fontFamily: "'JetBrains Mono', monospace",
      color: isUnlocked ? "#ffffff" : "rgba(255, 255, 255, 0.35)",
      letterSpacing: "0.4px",
      lineHeight: "1",
    });

    // Central Pixel Art Planet Sprite
    const planetImg = document.createElement("img");
    planetImg.src = style.sprite;
    planetImg.alt = style.badge;
    Object.assign(planetImg.style, {
      width: "36px",
      height: "36px",
      imageRendering: "pixelated",
      opacity: isUnlocked ? "1" : "0.35",
      filter: isUnlocked ? "none" : "grayscale(0.85)",
      pointerEvents: "none",
      margin: "1px 0",
    });

    // Planet Badge below image
    const planetBadge = document.createElement("span");
    planetBadge.textContent = style.badge;
    Object.assign(planetBadge.style, {
      fontSize: "7px",
      fontWeight: "700",
      fontFamily: "'JetBrains Mono', monospace",
      color: isUnlocked ? style.accentColor : "rgba(255, 255, 255, 0.25)",
      letterSpacing: "0.4px",
      lineHeight: "1",
    });

    portalHub.append(lvlTag, planetImg, planetBadge);

    // Completion or Lock badge over hub
    if (isCompleted) {
      const checkIcon = document.createElement("div");
      checkIcon.appendChild(createElement(Check, { width: 12, height: 12, color: "#ffffff", "stroke-width": 3 }));
      Object.assign(checkIcon.style, {
        position: "absolute",
        top: "-3px",
        right: "-3px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "#10B981",
        border: "1.5px solid #060911",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
      portalHub.appendChild(checkIcon);
    } else if (!isUnlocked) {
      const lockIcon = document.createElement("div");
      lockIcon.appendChild(createElement(Lock, { width: 11, height: 11, color: "rgba(255, 255, 255, 0.5)" }));
      Object.assign(lockIcon.style, {
        position: "absolute",
        top: "-3px",
        right: "-3px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "#1E293B",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
      portalHub.appendChild(lockIcon);
    }

    // ── Attached Crisp 2D Mission Card (Clean 2D Liquid Glass Dossier) ──
    const card = document.createElement("div");
    card.className = "stage-card-panel";
    Object.assign(card.style, {
      width: "100%",
      background: isCurrentActive
        ? "rgba(13, 19, 33, 0.94)"
        : isCompleted
        ? "rgba(11, 16, 27, 0.88)"
        : "rgba(10, 14, 22, 0.65)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: isCurrentActive
        ? `1px solid rgba(56, 189, 248, 0.45)`
        : isCompleted
        ? `1px solid rgba(16, 185, 129, 0.3)`
        : `1px solid rgba(255, 255, 255, 0.08)`,
      borderRadius: "10px",
      padding: "13px",
      display: "flex",
      flexDirection: "column",
      gap: "9px",
      transition: "all 0.15s ease",
    });

    // Card Header (Name + Stars)
    const cHead = document.createElement("div");
    Object.assign(cHead.style, {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "6px",
    });

    const cTitles = document.createElement("div");
    cTitles.innerHTML = `
      <div style="font-size:13px; font-weight:700; color:#ffffff; letter-spacing:0.2px;">${obj.label}</div>
      <div style="font-size:10px; color:rgba(255, 255, 255, 0.5); font-family:'JetBrains Mono', monospace; margin-top:2px;">
        ${obj.destination} · ${obj.distanceKm}
      </div>
    `;

    const cStars = document.createElement("div");
    Object.assign(cStars.style, { display: "flex", alignItems: "center", gap: "2px" });
    for (let s = 0; s < obj.stars; s++) {
      cStars.appendChild(createElement(Star, { width: 9, height: 9, color: "#FBBF24", fill: "#FBBF24" }));
    }

    cHead.append(cTitles, cStars);

    // Telemetry Mini Grid
    const telem = document.createElement("div");
    Object.assign(telem.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4px 6px",
      background: "rgba(255, 255, 255, 0.025)",
      borderRadius: "6px",
      padding: "6px 8px",
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.75)",
    });

    const item = (node: Node, val: string, col?: string) => {
      const d = document.createElement("div");
      Object.assign(d.style, {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        color: col ?? "rgba(255,255,255,0.7)",
      });
      d.append(node);
      const s = document.createElement("span");
      s.textContent = val;
      d.appendChild(s);
      return d;
    };

    telem.append(
      item(createElement(Sun, { width: 10, height: 10, color: "#FBBF24" }), `Sun ${obj.sunlightPct}%`),
      item(createElement(Flame, { width: 10, height: 10, color: "#FF004D" }), `Heat ${obj.heatDanger}`),
      item(createElement(ShieldAlert, { width: 10, height: 10, color: "#29ADFF" }), `Rad ${obj.radiation}`),
      item(createElement(Sparkles, { width: 10, height: 10, color: "#34D399" }), `Goal ${obj.scienceGoal} pts`),
      item(createElement(Compass, { width: 10, height: 10, color: "#A78BFA" }), `$${obj.budget}M`),
      item(createElement(Rocket, { width: 10, height: 10, color: "#FFF1E8" }), `${obj.starInstrument}`),
    );

    // Launch Button / Status
    const actionBlock = document.createElement("div");
    Object.assign(actionBlock.style, { marginTop: "2px" });

    if (this.isHost) {
      const btn = document.createElement("button");
      btn.setAttribute("data-objective-btn", obj.id);
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.gap = "6px";
      btn.style.width = "100%";

      const btnLabel = document.createElement("span");
      btnLabel.setAttribute("data-btn-label", "true");

      if (!isUnlocked) {
        btn.disabled = true;
        btn.appendChild(createElement(Lock, { width: 11, height: 11 }));
        btnLabel.textContent = `LOCKED // PASS LVL ${obj.level - 1}`;
        btn.appendChild(btnLabel);

        Object.assign(btn.style, {
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "6px",
          color: "rgba(255, 255, 255, 0.3)",
          fontSize: "10.5px",
          fontFamily: "'JetBrains Mono', monospace",
          padding: "8px 10px",
          cursor: "not-allowed",
        });
      } else {
        btn.appendChild(createElement(Rocket, { width: 12, height: 12, "stroke-width": 2 }));
        btnLabel.textContent = isTestingAll
          ? `AUTHORIZE LEVEL ${obj.level}`
          : isCompleted
          ? `REPLAY LEVEL ${obj.level}`
          : `AUTHORIZE LEVEL ${obj.level}`;
        btn.appendChild(btnLabel);

        const btnBg = (isTestingAll || !isCompleted) ? "#29ADFF" : "rgba(16, 185, 129, 0.15)";
        const btnTextColor = (isTestingAll || !isCompleted) ? "#040810" : "#34D399";
        const btnBorder = (isTestingAll || !isCompleted) ? "none" : "1px solid rgba(16, 185, 129, 0.35)";

        Object.assign(btn.style, {
          background: btnBg,
          boxShadow: isCompleted && !isTestingAll
            ? "inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "0 2px 8px rgba(0, 0, 0, 0.4)",
          border: btnBorder,
          borderRadius: "6px",
          color: btnTextColor,
          fontSize: "11px",
          fontWeight: "700",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.4px",
          padding: "8px 12px",
          cursor: "pointer",
          transition: "all 0.12s ease",
        });

        btn.addEventListener("mouseenter", () => {
          if (!btn.disabled) {
            btn.style.opacity = "0.92";
            btn.style.transform = "translateY(-1px)";
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (!btn.disabled) {
            btn.style.opacity = "1";
            btn.style.transform = "translateY(0)";
          }
        });
        btn.addEventListener("click", () => {
          btn.disabled = true;
          btnLabel.textContent = "TRANSMITTING VECTOR...";
          btn.style.opacity = "0.6";
          btn.style.cursor = "not-allowed";
          ColyseusService.selectObjective(obj.id);
        });
      }

      actionBlock.appendChild(btn);
    } else {
      const statusText = document.createElement("div");
      Object.assign(statusText.style, {
        fontSize: "10.5px",
        fontFamily: "'JetBrains Mono', monospace",
        textAlign: "center",
        color: isCurrentActive ? "#29ADFF" : isCompleted ? "#34D399" : "rgba(255, 255, 255, 0.3)",
        padding: "5px 0",
      });
      statusText.textContent = !isUnlocked
        ? `SECTOR LOCKED (LVL ${obj.level})`
        : isCompleted
        ? `LEVEL ${obj.level} CLEARED`
        : `LEVEL ${obj.level} READY FOR LAUNCH`;
      actionBlock.appendChild(statusText);
    }

    card.append(cHead, telem, actionBlock);
    stationWrapper.append(portalHub, card);
    return stationWrapper;
  }

  // ── Dynamic Horizontal Pipeline Ribbon Generation ──────────────────────

  private _setupPipelineRibbons(): void {
    const updateRibbons = () => {
      if (!this.worldTrack) return;
      const trackRect = this.worldTrack.getBoundingClientRect();
      const group = this.svgLayer.querySelector("#ribbon-paths-group");
      if (!group) return;

      let html = "";

      // Connect Level 1 -> 2 -> 3 -> 4 -> 5 -> 6
      for (let lvl = 1; lvl < 6; lvl++) {
        const fromWrapper = this.portalEls.get(lvl);
        const toWrapper = this.portalEls.get(lvl + 1);
        if (!fromWrapper || !toWrapper) continue;

        const fromHub = fromWrapper.querySelector(".stage-portal-hub") as HTMLElement;
        const toHub = toWrapper.querySelector(".stage-portal-hub") as HTMLElement;
        if (!fromHub || !toHub) continue;

        const fromRect = fromHub.getBoundingClientRect();
        const toRect = toHub.getBoundingClientRect();

        // Connect right of hub to left of next hub
        const start = {
          x: fromRect.right - trackRect.left + 2,
          y: fromRect.top + fromRect.height / 2 - trackRect.top,
          dx: 1,
          dy: 0,
        };
        const end = {
          x: toRect.left - trackRect.left - 2,
          y: toRect.top + toRect.height / 2 - trackRect.top,
          dx: -1,
          dy: 0,
        };

        const isConnUnlocked = this.highestUnlockedLevel >= lvl + 1;
        const isConnCompleted = this.highestUnlockedLevel > lvl + 1;

        const { ribbonPath, centerCurve } = generateRibbonPath(start, end, 22, 3);

        if (ribbonPath) {
          const ribbonFill = isConnCompleted
            ? "#0D1E18"
            : isConnUnlocked
            ? "#0E1828"
            : "#090E17";

          const ribbonStroke = isConnCompleted
            ? "rgba(16, 185, 129, 0.4)"
            : isConnUnlocked
            ? "rgba(56, 189, 248, 0.35)"
            : "rgba(255, 255, 255, 0.05)";

          const pulseStroke = isConnCompleted
            ? "#10B981"
            : isConnUnlocked
            ? "#38BDF8"
            : "rgba(255, 255, 255, 0.08)";

          const flowClass = isConnUnlocked ? "ribbon-flow-active" : "";

          html += `
            <g class="ribbon-connection-segment">
              <!-- Crisp 2D Flared Ribbon Body (No Blurry Filters) -->
              <path d="${ribbonPath}" fill="${ribbonFill}" stroke="${ribbonStroke}" stroke-width="1.2" opacity="0.95" />
              <!-- Trajectory Flight Vector Line -->
              <path d="${centerCurve}" class="${flowClass}" fill="none" stroke="${pulseStroke}" stroke-width="${isConnUnlocked ? '1.6' : '1'}" stroke-dasharray="${isConnUnlocked ? '6 7' : '3 6'}" />
            </g>
          `;
        }
      }

      group.innerHTML = html;
    };

    const schedule = () => {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.animFrameId = requestAnimationFrame(updateRibbons);
    };

    this.resizeObserver = new ResizeObserver(schedule);
    this.resizeObserver.observe(this.worldTrack);
    window.addEventListener("resize", schedule);
    setTimeout(schedule, 60);
  }

  // ── Drag & Scroll Mechanics ────────────────────────────────────────────

  private _setupDragScroll(): void {
    const vp = this.scrollViewport;
    if (!vp) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    vp.addEventListener("mousedown", (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      isDown = true;
      vp.style.cursor = "grabbing";
      startX = e.pageX - vp.offsetLeft;
      scrollLeft = vp.scrollLeft;
    });

    window.addEventListener("mouseup", () => {
      isDown = false;
      if (vp) vp.style.cursor = "grab";
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDown || !vp) return;
      e.preventDefault();
      const x = e.pageX - vp.offsetLeft;
      const walk = (x - startX) * 1.5;
      vp.scrollLeft = scrollLeft - walk;
    });

    // Vertical wheel to horizontal scroll converter
    vp.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          vp.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  private _scrollToActiveLevel(): void {
    setTimeout(() => {
      const activeEl = this.portalEls.get(this.highestUnlockedLevel);
      if (activeEl && this.scrollViewport) {
        const rect = activeEl.getBoundingClientRect();
        const target =
          this.scrollViewport.scrollLeft +
          rect.left -
          window.innerWidth / 2 +
          rect.width / 2;
        this.scrollViewport.scrollTo({ left: target, behavior: "smooth" });
      }
    }, 150);
  }

  private _injectStyles(): void {
    if (document.getElementById("pipeline-ribbon-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "pipeline-ribbon-styles";
    styleEl.textContent = `
      @keyframes ribbonFlowDash {
        from { stroke-dashoffset: 26; }
        to { stroke-dashoffset: 0; }
      }
      .ribbon-flow-active {
        animation: ribbonFlowDash 1.2s linear infinite;
      }
      #pipeline-scroll-viewport::-webkit-scrollbar {
        height: 6px;
      }
      #pipeline-scroll-viewport::-webkit-scrollbar-track {
        background: rgba(5, 8, 14, 0.8);
      }
      #pipeline-scroll-viewport::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      #pipeline-scroll-viewport::-webkit-scrollbar-thumb:hover {
        background: #29ADFF;
      }
    `;
    document.head.appendChild(styleEl);
  }
}
