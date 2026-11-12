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
  Trophy,
} from "lucide";
import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { OBJECTIVES, Objective } from "../game/data/ObjectiveData";

/**
 * Generates an organic flared ribbon SVG path connecting level cards.
 * Inspired by Thinker PipelineRibbon with cubic bezier tangents and flared fillets.
 */
function generateRibbonPath(
  start: { x: number; y: number; dx: number; dy: number },
  end: { x: number; y: number; dx: number; dy: number },
  filletRadius: number = 22,
  baseHalfWidth: number = 2.0,
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

interface ConnectionDef {
  fromLevel: number;
  fromSide: "right" | "bottom" | "left" | "top";
  toLevel: number;
  toSide: "left" | "top" | "right" | "bottom";
  unlockedAt: number;
}

const ZIGZAG_CONNECTIONS: ConnectionDef[] = [
  // Row 1 (Left to Right): Level 1 -> Level 2 -> Level 3
  { fromLevel: 1, fromSide: "right", toLevel: 2, toSide: "left", unlockedAt: 2 },
  { fromLevel: 2, fromSide: "right", toLevel: 3, toSide: "left", unlockedAt: 3 },
  // Vertical S-Turn: Level 3 (bottom) -> Level 4 (top)
  { fromLevel: 3, fromSide: "bottom", toLevel: 4, toSide: "top", unlockedAt: 4 },
  // Row 2 (Right to Left): Level 4 -> Level 5 -> Level 6
  { fromLevel: 4, fromSide: "left", toLevel: 5, toSide: "right", unlockedAt: 5 },
  { fromLevel: 5, fromSide: "left", toLevel: 6, toSide: "right", unlockedAt: 6 },
];

/**
 * ObjectivePicker
 * ───────────────
 * Pre-flight Campaign Pipeline Ribbon interface.
 * Winding horizontal zigzag (S-Curve) pipeline connecting Levels 1 to 6
 * with Liquid Glass aerospace aesthetics, pixel-art hardware accents,
 * dynamic SVG flared manifold ribbons, and live server-authoritative locks.
 */
export class ObjectivePicker {
  private container: HTMLDivElement;
  private isHost: boolean;
  private highestUnlockedLevel: number;
  private errorBanner: HTMLDivElement | null = null;
  private svgLayer!: SVGSVGElement;
  private pipelineCanvas!: HTMLDivElement;
  private resizeObserver: ResizeObserver | null = null;
  private animFrameId: number | null = null;
  private cardEls: Map<number, HTMLDivElement> = new Map();

  constructor(isHost: boolean, highestUnlockedLevel: number = 1) {
    this.isHost = isHost;
    this.highestUnlockedLevel = highestUnlockedLevel;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
    this._setupPipelineRibbons();
  }

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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
    const { colors, font } = Theme;
    this.cardEls.clear();

    // Ensure pipeline animation styles exist
    this._injectStyles();

    const overlay = document.createElement("div");
    overlay.id = "objective-picker-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: "rgba(5, 8, 14, 0.92)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      background: "rgba(10, 14, 23, 0.92)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 28px 64px rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(24px) saturate(1.5)",
      WebkitBackdropFilter: "blur(24px) saturate(1.5)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "18px",
      padding: "24px 28px",
      width: "1140px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      overflowY: "auto",
      overflowX: "hidden",
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      position: "relative",
    });

    // ── Header ──
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    });

    const titleRow = document.createElement("div");
    Object.assign(titleRow.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    });

    const titleBox = document.createElement("div");
    Object.assign(titleBox.style, { display: "flex", alignItems: "center", gap: "10px" });

    const pixelBeacon = document.createElement("div");
    pixelBeacon.className = "pixel-beacon";
    Object.assign(pixelBeacon.style, {
      width: "10px",
      height: "10px",
      background: "#29ADFF",
      borderRadius: "2px",
      boxShadow: "0 0 12px #29ADFF",
    });

    const title = document.createElement("h2");
    title.textContent = "NASA DEEP SPACE CAMPAIGN PIPELINE";
    Object.assign(title.style, {
      color: "#ffffff",
      fontSize: "17px",
      fontWeight: "700",
      letterSpacing: "0.8px",
      margin: "0",
      fontFamily: "'JetBrains Mono', monospace",
    });

    const levelCounter = document.createElement("span");
    levelCounter.textContent = `[ LEVEL ${this.highestUnlockedLevel} / 6 ACTIVE ]`;
    Object.assign(levelCounter.style, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "#34D399",
      background: "rgba(52, 211, 153, 0.1)",
      border: "1px solid rgba(52, 211, 153, 0.3)",
      borderRadius: "4px",
      padding: "2px 8px",
      letterSpacing: "0.5px",
    });

    titleBox.append(pixelBeacon, title, levelCounter);

    const statusPill = document.createElement("span");
    Object.assign(statusPill.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      color: this.isHost ? "#29ADFF" : "rgba(255, 255, 255, 0.5)",
      background: "rgba(255, 255, 255, 0.05)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.15), inset 0 0 0 0.5px rgba(255, 255, 255, 0.05)",
      border: "none",
      padding: "5px 12px",
      borderRadius: "6px",
    });

    if (this.isHost) {
      statusPill.appendChild(createElement(Rocket, { width: 13, height: 13, "stroke-width": 1.6 }));
      const hostLabel = document.createElement("span");
      hostLabel.textContent = "MISSION COMMANDER // AUTHORIZED";
      statusPill.appendChild(hostLabel);
    } else {
      statusPill.appendChild(createElement(Clock, { width: 13, height: 13, "stroke-width": 1.6 }));
      const waitLabel = document.createElement("span");
      waitLabel.textContent = "CREW // AWAITING COMMAND";
      statusPill.appendChild(waitLabel);
    }

    titleRow.append(titleBox, statusPill);

    const subtitle = document.createElement("p");
    subtitle.textContent = this.isHost
      ? "Follow the zigzag mission trajectory from Low Earth Orbit to Titan. Complete prior orbits to authorize deep-space flight vectors."
      : "Mission Commander is configuring the deep-space flight trajectory along the pipeline ribbon...";
    Object.assign(subtitle.style, {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "12px",
      margin: "0",
      lineHeight: "1.4",
    });

    header.append(titleRow, subtitle);

    this.errorBanner = document.createElement("div");
    Object.assign(this.errorBanner.style, {
      display: "none",
      padding: "8px 14px",
      borderRadius: "6px",
      background: "rgba(255, 0, 77, 0.15)",
      border: "1px solid #FF004D",
      color: "#FF004D",
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
    });

    const hr = document.createElement("hr");
    hr.style.borderColor = "rgba(255, 255, 255, 0.08)";
    hr.style.margin = "0";

    // ── Pipeline Canvas (Relative container holding SVG ribbons + Grid of cards) ──
    this.pipelineCanvas = document.createElement("div");
    Object.assign(this.pipelineCanvas.style, {
      position: "relative",
      width: "100%",
      marginTop: "4px",
    });

    // SVG Manifold Ribbon Layer
    this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgLayer.setAttribute("class", "pipeline-ribbon-svg");
    Object.assign(this.svgLayer.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "1",
      overflow: "visible",
    });

    this.svgLayer.innerHTML = `
      <defs>
        <linearGradient id="activeRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#29ADFF" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#00D2D3" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#34D399" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="completedRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.75" />
        </linearGradient>
        <linearGradient id="lockedRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.1)" />
          <stop offset="100%" stop-color="rgba(255, 255, 255, 0.03)" />
        </linearGradient>
        <filter id="ribbonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g id="ribbon-paths-group"></g>
    `;

    // ── 3-Column x 2-Row Zigzag Grid ──
    const cardsGrid = document.createElement("div");
    Object.assign(cardsGrid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "28px 36px",
      position: "relative",
      zIndex: "2",
      width: "100%",
    });

    // Populate the 6 levels into the zigzag pattern
    OBJECTIVES.forEach((obj) => {
      const card = this._buildLevelCard(obj);
      this.cardEls.set(obj.level, card);

      // Explicit grid positioning to form the S-Curve Zigzag:
      // Row 1 (Left to Right): Level 1 (col 1), Level 2 (col 2), Level 3 (col 3)
      // Row 2 (Right to Left): Level 4 (col 3), Level 5 (col 2), Level 6 (col 1)
      if (obj.level === 1) card.style.gridArea = "1 / 1 / 2 / 2";
      else if (obj.level === 2) card.style.gridArea = "1 / 2 / 2 / 3";
      else if (obj.level === 3) card.style.gridArea = "1 / 3 / 2 / 4";
      else if (obj.level === 4) card.style.gridArea = "2 / 3 / 3 / 4";
      else if (obj.level === 5) card.style.gridArea = "2 / 2 / 3 / 3";
      else if (obj.level === 6) card.style.gridArea = "2 / 1 / 3 / 2";

      cardsGrid.appendChild(card);
    });

    this.pipelineCanvas.append(this.svgLayer, cardsGrid);
    panel.append(header, this.errorBanner, hr, this.pipelineCanvas);
    overlay.appendChild(panel);
    return overlay;
  }

  private _buildLevelCard(obj: Objective): HTMLDivElement {
    const { colors, font } = Theme;
    const isUnlocked = obj.level <= this.highestUnlockedLevel;
    const isCompleted = obj.level < this.highestUnlockedLevel;
    const isCurrentActive = obj.level === this.highestUnlockedLevel;

    const card = document.createElement("div");
    card.setAttribute("data-level-node", String(obj.level));
    card.id = `level-node-${obj.level}`;

    Object.assign(card.style, {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: isCurrentActive
        ? "rgba(16, 24, 40, 0.88)"
        : isCompleted
        ? "rgba(12, 22, 28, 0.82)"
        : "rgba(14, 18, 28, 0.55)",
      boxShadow: isCurrentActive
        ? "inset 0 1px 0.5px rgba(255, 255, 255, 0.28), inset 0 0 0 0.5px rgba(56, 189, 248, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(41, 173, 255, 0.18)"
        : isCompleted
        ? "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(52, 211, 153, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5)"
        : "inset 0 1px 0.5px rgba(255, 255, 255, 0.08), inset 0 0 0 0.5px rgba(255, 255, 255, 0.04), 0 6px 18px rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      border: isCurrentActive
        ? "1px solid rgba(56, 189, 248, 0.45)"
        : isCompleted
        ? "1px solid rgba(52, 211, 153, 0.35)"
        : "1px dashed rgba(255, 255, 255, 0.12)",
      borderRadius: "14px",
      padding: "16px 18px",
      gap: "12px",
      opacity: isUnlocked ? "1" : "0.58",
      position: "relative",
      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    });

    if (isUnlocked) {
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-3px)";
        card.style.boxShadow =
          "inset 0 1px 0.5px rgba(255, 255, 255, 0.35), inset 0 0 0 0.5px rgba(56, 189, 248, 0.5), 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(41, 173, 255, 0.25)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = isCurrentActive
          ? "inset 0 1px 0.5px rgba(255, 255, 255, 0.28), inset 0 0 0 0.5px rgba(56, 189, 248, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(41, 173, 255, 0.18)"
          : isCompleted
          ? "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(52, 211, 153, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5)"
          : "inset 0 1px 0.5px rgba(255, 255, 255, 0.08), inset 0 0 0 0.5px rgba(255, 255, 255, 0.04), 0 6px 18px rgba(0, 0, 0, 0.4)";
      });
    }

    // Top Section
    const topSection = document.createElement("div");
    Object.assign(topSection.style, { display: "flex", flexDirection: "column", gap: "8px" });

    // Level Header Row
    const headerRow = document.createElement("div");
    Object.assign(headerRow.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
    });

    const levelBadgeGroup = document.createElement("div");
    Object.assign(levelBadgeGroup.style, { display: "flex", alignItems: "center", gap: "6px" });

    const lvlBadge = document.createElement("span");
    lvlBadge.textContent = `[ LVL ${obj.level} ]`;
    Object.assign(lvlBadge.style, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.5px",
      color: isCurrentActive ? "#29ADFF" : isCompleted ? "#34D399" : "rgba(255, 255, 255, 0.4)",
      background: isCurrentActive
        ? "rgba(41, 173, 255, 0.15)"
        : isCompleted
        ? "rgba(52, 211, 153, 0.15)"
        : "rgba(255, 255, 255, 0.06)",
      border: isCurrentActive
        ? "1px solid rgba(41, 173, 255, 0.4)"
        : isCompleted
        ? "1px solid rgba(52, 211, 153, 0.3)"
        : "1px solid rgba(255, 255, 255, 0.08)",
      padding: "2px 6px",
      borderRadius: "4px",
    });

    const idBadge = document.createElement("span");
    idBadge.textContent = obj.id;
    Object.assign(idBadge.style, {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "10px",
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.6)",
      background: "rgba(255, 255, 255, 0.06)",
      padding: "2px 5px",
      borderRadius: "4px",
    });

    levelBadgeGroup.append(lvlBadge, idBadge);

    // Difficulty Stars
    const diffGroup = document.createElement("div");
    Object.assign(diffGroup.style, { display: "flex", alignItems: "center", gap: "2px" });
    for (let i = 0; i < obj.stars; i++) {
      diffGroup.appendChild(createElement(Star, { width: 10, height: 10, color: "#FBBF24", fill: "#FBBF24" }));
    }
    const diffLabel = document.createElement("span");
    diffLabel.textContent = ` ${obj.difficulty}`;
    Object.assign(diffLabel.style, {
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.6)",
      marginLeft: "4px",
      textTransform: "uppercase",
    });
    diffGroup.appendChild(diffLabel);

    headerRow.append(levelBadgeGroup, diffGroup);

    // Mission Title & Destination
    const titleBlock = document.createElement("div");
    Object.assign(titleBlock.style, { display: "flex", flexDirection: "column", gap: "2px" });

    const nameEl = document.createElement("div");
    nameEl.textContent = obj.label;
    Object.assign(nameEl.style, {
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "700",
      letterSpacing: "0.2px",
    });

    const destEl = document.createElement("div");
    destEl.textContent = `${obj.destination} · ${obj.distanceKm}`;
    Object.assign(destEl.style, {
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: "10.5px",
      fontFamily: "'JetBrains Mono', monospace",
    });

    titleBlock.append(nameEl, destEl);

    // Telemetry Compact Strip (2x3 Grid)
    const telemetryGrid = document.createElement("div");
    Object.assign(telemetryGrid.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "4px 8px",
      background: "rgba(255, 255, 255, 0.03)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.1), inset 0 0 0 0.5px rgba(255, 255, 255, 0.04)",
      borderRadius: "8px",
      padding: "8px 10px",
      marginTop: "4px",
    });

    const createPill = (iconNode: Node, text: string, highlight?: string) => {
      const p = document.createElement("div");
      Object.assign(p.style, {
        display: "flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "10.5px",
        fontFamily: "'JetBrains Mono', monospace",
        color: highlight ?? "rgba(255, 255, 255, 0.75)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      p.append(iconNode);
      const span = document.createElement("span");
      span.textContent = text;
      p.appendChild(span);
      return p;
    };

    telemetryGrid.append(
      createPill(createElement(Sun, { width: 11, height: 11, color: "#FBBF24" }), `Sun ${obj.sunlightPct}%`),
      createPill(createElement(Flame, { width: 11, height: 11, color: "#FF004D" }), `Heat ${obj.heatDanger}`),
      createPill(createElement(ShieldAlert, { width: 11, height: 11, color: "#29ADFF" }), `Rad ${obj.radiation}`),
      createPill(createElement(Sparkles, { width: 11, height: 11, color: "#34D399" }), `Goal ${obj.scienceGoal} pts`),
      createPill(createElement(Compass, { width: 11, height: 11, color: "#A78BFA" }), `$${obj.budget}M Budget`),
      createPill(createElement(Rocket, { width: 11, height: 11, color: "#FFF1E8" }), `${obj.starInstrument}`),
    );

    topSection.append(headerRow, titleBlock, telemetryGrid);
    card.appendChild(topSection);

    // Bottom Action / State Row
    const actionRow = document.createElement("div");
    Object.assign(actionRow.style, {
      marginTop: "10px",
      paddingTop: "8px",
      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    });

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
        btn.appendChild(createElement(Lock, { width: 12, height: 12, "stroke-width": 2 }));
        btnLabel.textContent = `LOCKED // NEED LVL ${obj.level - 1}`;
        btn.appendChild(btnLabel);

        Object.assign(btn.style, {
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          color: "rgba(255, 255, 255, 0.35)",
          fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace",
          padding: "8px 12px",
          cursor: "not-allowed",
        });
      } else {
        btn.appendChild(createElement(Rocket, { width: 13, height: 13, "stroke-width": 2 }));
        btnLabel.textContent = isCompleted
          ? `REPLAY LEVEL ${obj.level}`
          : `AUTHORIZE LEVEL ${obj.level}`;
        btn.appendChild(btnLabel);

        Object.assign(btn.style, {
          background: isCompleted
            ? "rgba(52, 211, 153, 0.16)"
            : "#ffffff",
          boxShadow: isCompleted
            ? "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), 0 2px 10px rgba(52, 211, 153, 0.15)"
            : "0 4px 18px rgba(255, 255, 255, 0.25), inset 0 1px 1px #ffffff",
          border: isCompleted ? "1px solid rgba(52, 211, 153, 0.4)" : "none",
          borderRadius: "8px",
          color: isCompleted ? "#34D399" : "#04060A",
          fontSize: "11.5px",
          fontWeight: "700",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.4px",
          padding: "8px 14px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        });

        btn.addEventListener("mouseenter", () => {
          if (!btn.disabled) {
            btn.style.transform = "scale(1.02)";
          }
        });
        btn.addEventListener("mouseleave", () => {
          if (!btn.disabled) {
            btn.style.transform = "scale(1)";
          }
        });
        btn.addEventListener("click", () => {
          btn.disabled = true;
          btnLabel.textContent = "TRANSMITTING FLIGHT PLAN...";
          btn.style.opacity = "0.7";
          btn.style.cursor = "not-allowed";
          ColyseusService.selectObjective(obj.id);
        });
      }

      actionRow.appendChild(btn);
    } else {
      // Non-host crew display
      const crewStatus = document.createElement("span");
      Object.assign(crewStatus.style, {
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
        color: isCurrentActive ? "#29ADFF" : isCompleted ? "#34D399" : "rgba(255, 255, 255, 0.35)",
        display: "flex",
        alignItems: "center",
        gap: "5px",
      });

      if (!isUnlocked) {
        crewStatus.appendChild(createElement(Lock, { width: 11, height: 11 }));
        crewStatus.append(document.createTextNode(`SECTOR ${obj.level} LOCKED`));
      } else if (isCompleted) {
        crewStatus.appendChild(createElement(Check, { width: 11, height: 11, color: "#34D399" }));
        crewStatus.append(document.createTextNode(`LEVEL ${obj.level} CLEARED`));
      } else {
        crewStatus.appendChild(createElement(Activity, { width: 11, height: 11, color: "#29ADFF" }));
        crewStatus.append(document.createTextNode(`LEVEL ${obj.level} ACTIVE TARGET`));
      }

      actionRow.appendChild(crewStatus);
    }

    card.appendChild(actionRow);
    return card;
  }

  // ── Dynamic Ribbon Path Generation ──────────────────────────────────────

  private _setupPipelineRibbons(): void {
    const updateRibbons = () => {
      if (!this.pipelineCanvas) return;
      const containerRect = this.pipelineCanvas.getBoundingClientRect();
      if (containerRect.width < 100 || containerRect.height < 100) return;

      const group = this.svgLayer.querySelector("#ribbon-paths-group");
      if (!group) return;

      let html = "";

      for (const conn of ZIGZAG_CONNECTIONS) {
        const fromCard = this.cardEls.get(conn.fromLevel);
        const toCard = this.cardEls.get(conn.toLevel);
        if (!fromCard || !toCard) continue;

        const fromRect = fromCard.getBoundingClientRect();
        const toRect = toCard.getBoundingClientRect();

        const resolvePoint = (
          rect: DOMRect,
          side: "right" | "bottom" | "left" | "top",
        ): { x: number; y: number; dx: number; dy: number } => {
          let x = 0;
          let y = 0;
          let dx = 0;
          let dy = 0;

          if (side === "right") {
            x = rect.right - containerRect.left + 1;
            y = rect.top + rect.height / 2 - containerRect.top;
            dx = 1;
            dy = 0;
          } else if (side === "left") {
            x = rect.left - containerRect.left - 1;
            y = rect.top + rect.height / 2 - containerRect.top;
            dx = -1;
            dy = 0;
          } else if (side === "bottom") {
            x = rect.left + rect.width / 2 - containerRect.left;
            y = rect.bottom - containerRect.top + 1;
            dx = 0;
            dy = 1;
          } else if (side === "top") {
            x = rect.left + rect.width / 2 - containerRect.left;
            y = rect.top - containerRect.top - 1;
            dx = 0;
            dy = -1;
          }
          return { x, y, dx, dy };
        };

        const start = resolvePoint(fromRect, conn.fromSide);
        const end = resolvePoint(toRect, conn.toSide);

        const isConnectionUnlocked = this.highestUnlockedLevel >= conn.unlockedAt;
        const isConnectionCompleted = this.highestUnlockedLevel > conn.unlockedAt;

        const { ribbonPath, centerCurve } = generateRibbonPath(start, end, 24, 2.5);

        if (ribbonPath) {
          const fillGrad = isConnectionCompleted
            ? "url(#completedRibbonGrad)"
            : isConnectionUnlocked
            ? "url(#activeRibbonGrad)"
            : "url(#lockedRibbonGrad)";

          const strokeBorder = isConnectionUnlocked
            ? "rgba(255, 255, 255, 0.28)"
            : "rgba(255, 255, 255, 0.08)";

          const glowFilter = isConnectionUnlocked ? 'filter="url(#ribbonGlow)"' : "";
          const flowClass = isConnectionUnlocked ? "ribbon-flow-line ribbon-flow-active" : "ribbon-flow-line-locked";

          html += `
            <g class="pipeline-connector-group">
              <!-- Flared Ribbon Body -->
              <path d="${ribbonPath}" fill="${fillGrad}" ${glowFilter} opacity="${isConnectionUnlocked ? 0.9 : 0.4}" />
              <path d="${ribbonPath}" fill="none" stroke="${strokeBorder}" stroke-width="0.8" />
              <!-- Center Energy Flow Line -->
              <path d="${centerCurve}" class="${flowClass}" fill="none" stroke="${isConnectionUnlocked ? '#ffffff' : 'rgba(255,255,255,0.12)'}" stroke-width="${isConnectionUnlocked ? '1.5' : '1'}" stroke-dasharray="${isConnectionUnlocked ? '5 7' : '2 6'}" />
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
    this.resizeObserver.observe(this.pipelineCanvas);
    this.cardEls.forEach((card) => this.resizeObserver?.observe(card));

    window.addEventListener("resize", schedule);
    setTimeout(schedule, 50);
  }

  private _injectStyles(): void {
    if (document.getElementById("pipeline-ribbon-styles")) return;
    const styleEl = document.createElement("style");
    styleEl.id = "pipeline-ribbon-styles";
    styleEl.textContent = `
      @keyframes ribbonFlowDash {
        from {
          stroke-dashoffset: 24;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      .ribbon-flow-active {
        animation: ribbonFlowDash 1.2s linear infinite;
      }
      .pixel-beacon {
        animation: beaconPulse 1.8s ease-in-out infinite alternate;
      }
      @keyframes beaconPulse {
        0% { transform: scale(0.9); opacity: 0.7; }
        100% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 16px #29ADFF; }
      }
    `;
    document.head.appendChild(styleEl);
  }
}
