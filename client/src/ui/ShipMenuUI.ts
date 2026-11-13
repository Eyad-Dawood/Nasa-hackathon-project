import {
  createElement,
  Rocket,
  Plus,
  Trash2,
  Info,
  Activity,
  X,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  FlaskConical,
  Compass,
  Shield,
  Box,
  Sparkles,
  Sun,
  Flame,
  Cpu,
  Radio,
  BatteryCharging,
  Maximize2,
  Check,
} from "lucide";
import { Theme, getRoleLabel, getRoleColor, RoleId } from "../config/theme";
import { getItemById, GameItem } from "../game/data/ItemData";
import { STATIONS } from "../game/data/StationData";
import { CarrySystem } from "../game/systems/CarrySystem";
import { ColyseusService } from "../network/ColyseusService";
import { ItemDetailUI } from "./ItemDetailUI";
import { LaunchResultUI } from "./LaunchResultUI";
import { runLaunchChecks } from "../game/data/LaunchSystem";
import { Objective } from "../game/data/ObjectiveData";
import { ShipEntrySnapshot } from "../game/entities/ShipEntity";
import { SoundFX } from "../audio/SoundEffects";

/**
 * Visual metadata for planetary objectives matching the campaign map in ObjectivePicker.
 */
interface PlanetVisual {
  accentColor: string;
  glowColor: string;
  badge: string;
  sprite: string;
}

const PLANET_VISUALS: Record<string, PlanetVisual> = {
  M04: {
    accentColor: "#29ADFF",
    glowColor: "rgba(41, 173, 255, 0.45)",
    badge: "EARTH ORBIT",
    sprite: "/assets/planets/planet_earth_64.png",
  },
  M01: {
    accentColor: "#CBD5E1",
    glowColor: "rgba(203, 213, 225, 0.45)",
    badge: "THE MOON",
    sprite: "/assets/planets/planet_moon_64.png",
  },
  M02: {
    accentColor: "#F87171",
    glowColor: "rgba(248, 113, 113, 0.45)",
    badge: "MARS OUTPOST",
    sprite: "/assets/planets/planet_mars_64.png",
  },
  M03: {
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.45)",
    badge: "EUROPA SUBSURFACE",
    sprite: "/assets/planets/planet_europa_64.png",
  },
  M05: {
    accentColor: "#FBBF24",
    glowColor: "rgba(251, 191, 36, 0.45)",
    badge: "SOLAR CORONA",
    sprite: "/assets/planets/planet_sun_64.png",
  },
  M06: {
    accentColor: "#34D399",
    glowColor: "rgba(52, 211, 153, 0.45)",
    badge: "TITAN ATMOSPHERE",
    sprite: "/assets/planets/planet_titan_64.png",
  },
};

/**
 * Visual styling and metadata for each aerospace department.
 */
interface DepartmentConfig {
  roleId: string;
  name: string;
  shortCode: string;
  sectorTag: string;
  accentColor: string;
  glowColor: string;
  bgGradient: string;
  icon: any;
}

const DEPARTMENTS: Record<string, DepartmentConfig> = {
  powerAndThermal: {
    roleId: "powerAndThermal",
    name: "Power & Thermal Systems",
    shortCode: "PWR / THM",
    sectorTag: "SECTOR NW // 2,2",
    accentColor: "#F87171",
    glowColor: "rgba(248, 113, 113, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(248, 113, 113, 0.12) 0%, rgba(15, 20, 32, 0.8) 100%)",
    icon: Flame,
  },
  structureAndComputing: {
    roleId: "structureAndComputing",
    name: "Structure & Avionics",
    shortCode: "STR / COMP",
    sectorTag: "SECTOR NE // 17,2",
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 20, 32, 0.8) 100%)",
    icon: Cpu,
  },
  Communications: {
    roleId: "Communications",
    name: "Communications & Shields",
    shortCode: "COMM / DEF",
    sectorTag: "SECTOR SW // 2,12",
    accentColor: "#34D399",
    glowColor: "rgba(52, 211, 153, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(52, 211, 153, 0.12) 0%, rgba(15, 20, 32, 0.8) 100%)",
    icon: Radio,
  },
  Science: {
    roleId: "Science",
    name: "Science & Payloads",
    shortCode: "SCI / EXP",
    sectorTag: "SECTOR SE // 17,12",
    accentColor: "#FBBF24",
    glowColor: "rgba(251, 191, 36, 0.35)",
    bgGradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(15, 20, 32, 0.8) 100%)",
    icon: FlaskConical,
  },
};

/**
 * Returns a fitting Lucide icon and color for an individual item category.
 */
function getItemVisual(category: string): { icon: any; color: string } {
  switch (category) {
    case "solar":
      return { icon: Sun, color: "#FBBF24" };
    case "nuclear":
      return { icon: Zap, color: "#34D399" };
    case "battery":
      return { icon: BatteryCharging, color: "#60A5FA" };
    case "fuel_tank":
    case "engine":
      return { icon: Flame, color: "#F87171" };
    case "frame":
      return { icon: Box, color: "#38BDF8" };
    case "computer":
      return { icon: Cpu, color: "#34D399" };
    case "shield":
      return { icon: Shield, color: "#818CF8" };
    case "radio":
      return { icon: Radio, color: "#67E8F9" };
    case "sensor":
    case "analyzer":
      return { icon: Compass, color: "#F472B6" };
    default:
      return { icon: Layers, color: "#38BDF8" };
  }
}

/**
 * ShipMenuUI
 * ──────────
 * Redesigned Spacecraft Manifest & Subsystem Telemetry HUD.
 *
 * Immersive space exploration game interface with:
 * - Deep space starry backdrop, subtle scanlines, and cyber HUD corner brackets.
 * - Dynamic planetary mission briefing panel with planetary badge and budget/science goals.
 * - Real-time telemetry core (Mass, Budget, Science, Used Space) with visual status indicators.
 * - 4 specialized aerospace department decks with custom glowing equipment slots.
 * - Carried item quick-install hotbar with instant feedback and sound design.
 * - Evaluate with Flight Director AI handoff, 12-rule launch audit modal, and ignition launch sequence.
 */
export class ShipMenuUI {
  private _container: HTMLDivElement;
  private _carry: CarrySystem;
  private _onClose: () => void;
  private _onConsultAi?: (contextPrompt?: string) => void;
  private _onLaunchMission?: () => void;
  private _openDetail: ItemDetailUI | null = null;
  private _openResult: LaunchResultUI | null = null;
  private _playerRoles: string[];
  private _objective: Objective | null;
  private _isHost: boolean;

  private _errorEl!: HTMLDivElement;
  private _contentEl!: HTMLDivElement;
  private _missionCardEl!: HTMLDivElement;
  private _snapshot: Map<string, ShipEntrySnapshot>;
  private _unsubShipError: (() => void) | null = null;
  private _pendingCarryAction: { type: "add" | "remove"; item: GameItem } | null = null;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    snapshot: Map<string, ShipEntrySnapshot>,
    carry: CarrySystem,
    playerRoles: string[],
    objective: Objective | null,
    isHost: boolean,
    onClose: () => void,
    onConsultAi?: (contextPrompt?: string) => void,
    onLaunchMission?: () => void,
  ) {
    this._snapshot = snapshot;
    this._carry = carry;
    this._playerRoles = playerRoles;
    this._objective = objective;
    this._isHost = isHost;
    this._onClose = onClose;
    this._onConsultAi = onConsultAi;
    this._onLaunchMission = onLaunchMission;
    this._container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this._container);

    // Keyboard listener for Escape to close
    this._keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        SoundFX.playClick();
        this.close();
      }
    };
    window.addEventListener("keydown", this._keydownHandler);

    this._unsubShipError = ColyseusService.on("shipError", (data: unknown) => {
      if (this._pendingCarryAction) {
        if (this._pendingCarryAction.type === "add" && !this._carry.isHolding) {
          this._carry.pickUp(this._pendingCarryAction.item);
        } else if (
          this._pendingCarryAction.type === "remove" &&
          this._carry.heldItem?.id === this._pendingCarryAction.item.id
        ) {
          this._carry.putDown();
        }
        this._pendingCarryAction = null;
        this._rebuildContent();
      }
      const msg = (data as { message?: string })?.message ?? "Spacecraft manifest action rejected.";
      SoundFX.playError();
      this._showError(msg);
    });
  }

  close(): void {
    if (this._keydownHandler) {
      window.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }
    this._unsubShipError?.();
    this._unsubShipError = null;
    this._pendingCarryAction = null;
    this._openDetail?.close();
    this._openResult?.close();
    this._container.remove();
    this._onClose();
  }

  setObjective(objective: Objective | null): void {
    this._objective = objective;
    this._updateMissionCard();
    this._rebuildContent();
  }

  setIsHost(isHost: boolean): void {
    this._isHost = isHost;
    this._rebuildContent();
  }

  refresh(snapshot: Map<string, ShipEntrySnapshot>): void {
    this._pendingCarryAction = null;
    this._snapshot = snapshot;
    this._rebuildContent();
  }

  // ── Private UI Builders ──────────────────────────────────────────────────

  private _showError(message: string): void {
    if (!this._errorEl) return;
    this._errorEl.innerHTML = `
      <span style="font-size:16px;">⚠️</span>
      <span style="flex:1;">${message}</span>
    `;
    this._errorEl.style.display = "flex";
    setTimeout(() => {
      if (this._errorEl) this._errorEl.style.display = "none";
    }, 4500);
  }

  private _injectStyles(): void {
    if (document.getElementById("ship-telemetry-hud-styles")) return;
    const style = document.createElement("style");
    style.id = "ship-telemetry-hud-styles";
    style.textContent = `
      @keyframes shipHudScanline {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(1000%); }
      }
      @keyframes shipGlowPulse {
        0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.4)); }
        50% { opacity: 1; filter: drop-shadow(0 0 20px rgba(56, 189, 248, 0.75)); }
      }
      @keyframes shipLaunchPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(52, 211, 153, 0.4), inset 0 0 10px rgba(52, 211, 153, 0.2); }
        50% { box-shadow: 0 0 35px rgba(52, 211, 153, 0.8), inset 0 0 16px rgba(52, 211, 153, 0.4); }
      }
      .ship-hud-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .ship-hud-scroll::-webkit-scrollbar-track {
        background: rgba(10, 14, 24, 0.7);
        border-radius: 4px;
      }
      .ship-hud-scroll::-webkit-scrollbar-thumb {
        background: #25334D;
        border-radius: 4px;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }
      .ship-hud-scroll::-webkit-scrollbar-thumb:hover {
        background: #38BDF8;
      }
      .ship-card-hover {
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .ship-card-hover:hover {
        transform: translateY(-1px);
        border-color: rgba(56, 189, 248, 0.5) !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(56, 189, 248, 0.2) !important;
      }
      .ship-btn-tactile {
        transition: all 0.12s ease;
      }
      .ship-btn-tactile:hover:not(:disabled) {
        filter: brightness(1.15);
        transform: translateY(-1px);
      }
      .ship-btn-tactile:active:not(:disabled) {
        transform: translateY(1px);
        filter: brightness(0.9);
      }
    `;
    document.head.appendChild(style);
  }

  private _buildDOM(): HTMLDivElement {
    const { font } = Theme;
    this._injectStyles();

    // ── Fullscreen Overlay ──
    const overlay = document.createElement("div");
    overlay.id = "ship-menu-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at center, rgba(14, 22, 38, 0.88) 0%, rgba(3, 6, 12, 0.96) 100%)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      zIndex: "1500",
      fontFamily: font.family,
      padding: "16px",
      userSelect: "none",
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        SoundFX.playClick();
        this.close();
      }
    });

    // ── Main Sci-Fi HUD Command Window ──
    const windowEl = document.createElement("div");
    windowEl.className = "ship-hud-window";
    Object.assign(windowEl.style, {
      position: "relative",
      width: "680px",
      maxWidth: "96vw",
      maxHeight: "92vh",
      background: "linear-gradient(180deg, #0C111C 0%, #080C14 100%)",
      border: "1.5px solid #1E293B",
      borderTop: "2px solid #38BDF8",
      borderRadius: "10px",
      boxShadow:
        "0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(56, 189, 248, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });

    // Subtle cosmic background stars & grid accent
    const bgDecor = document.createElement("div");
    Object.assign(bgDecor.style, {
      position: "absolute",
      inset: "0",
      backgroundImage: `
        radial-gradient(circle at 20% 15%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(52, 211, 153, 0.06) 0%, transparent 45%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: "100% 100%, 100% 100%, 28px 28px, 28px 28px",
      pointerEvents: "none",
      zIndex: "0",
    });
    windowEl.appendChild(bgDecor);

    // ── 1. Header Bar ──
    const header = this._buildHeader();
    windowEl.appendChild(header);

    // ── Scrollable Body Deck ──
    const bodyDeck = document.createElement("div");
    bodyDeck.className = "ship-hud-scroll";
    Object.assign(bodyDeck.style, {
      flex: "1",
      overflowY: "auto",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      zIndex: "1",
      position: "relative",
    });

    // ── 2. Error Banner ──
    this._errorEl = document.createElement("div");
    Object.assign(this._errorEl.style, {
      display: "none",
      alignItems: "center",
      gap: "10px",
      padding: "10px 14px",
      borderRadius: "6px",
      background: "rgba(248, 113, 113, 0.15)",
      border: "1px solid #F87171",
      color: "#FCA5A5",
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: "0 4px 16px rgba(248, 113, 113, 0.2)",
    });
    bodyDeck.appendChild(this._errorEl);

    // ── 3. Mission Directive Banner ──
    this._missionCardEl = document.createElement("div");
    this._updateMissionCard();
    bodyDeck.appendChild(this._missionCardEl);

    // ── 4. Telemetry Statistics Core & Equipment Decks Container ──
    this._contentEl = document.createElement("div");
    Object.assign(this._contentEl.style, {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
    });
    bodyDeck.appendChild(this._contentEl);

    windowEl.appendChild(bodyDeck);
    overlay.appendChild(windowEl);

    this._rebuildContent();
    return overlay;
  }

  /**
   * Builds the futuristic HUD Header with spacecraft icon, system status, and tactile close button.
   */
  private _buildHeader(): HTMLDivElement {
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 20px",
      background: "linear-gradient(180deg, #171F30 0%, #101624 100%)",
      borderBottom: "1.5px solid #1E293B",
      position: "relative",
      zIndex: "2",
    });

    // Left Title Group with Glowing Rocket Badge
    const leftGroup = document.createElement("div");
    Object.assign(leftGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    });

    const rocketBadge = document.createElement("div");
    Object.assign(rocketBadge.style, {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      background: "rgba(56, 189, 248, 0.14)",
      border: "1.5px solid rgba(56, 189, 248, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 14px rgba(56, 189, 248, 0.25)",
      animation: "shipGlowPulse 4s infinite ease-in-out",
    });
    rocketBadge.appendChild(createElement(Rocket, { width: 20, height: 20, color: "#38BDF8" }));

    const titleBox = document.createElement("div");
    titleBox.innerHTML = `
      <div style="font-size:14.5px; font-weight:800; color:#FFFFFF; letter-spacing:0.8px; font-family:'JetBrains Mono', monospace; display:flex; align-items:center; gap:8px;">
        SPACECRAFT MANIFEST & TELEMETRY
        <span style="font-size:9px; background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.4); color:#34D399; padding:2px 6px; border-radius:4px; font-weight:700;">ONLINE</span>
      </div>
      <div style="font-size:10.5px; color:rgba(255, 255, 255, 0.55); font-family:'JetBrains Mono', monospace; margin-top:2px;">
        ARTEMIS-I ASSEMBLY BAY • SUBSYSTEM BUS MONITOR
      </div>
    `;
    leftGroup.append(rocketBadge, titleBox);

    // Right Close Button
    const closeBtn = document.createElement("button");
    closeBtn.className = "ship-btn-tactile";
    Object.assign(closeBtn.style, {
      width: "30px",
      height: "30px",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "6px",
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: "13px",
      fontWeight: "800",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace",
    });
    closeBtn.appendChild(createElement(X, { width: 16, height: 16, color: "#FFFFFF" }));
    closeBtn.title = "Close Manifest (Esc)";
    closeBtn.addEventListener("click", () => {
      SoundFX.playClick();
      this.close();
    });

    header.append(leftGroup, closeBtn);
    return header;
  }

  /**
   * Refreshes the Mission Directive Card with planetary icon, budget, and science goals.
   */
  private _updateMissionCard(): void {
    if (!this._missionCardEl) return;
    this._missionCardEl.innerHTML = "";

    const obj = this._objective;
    if (!obj) {
      Object.assign(this._missionCardEl.style, {
        padding: "10px 14px",
        background: "rgba(30, 41, 59, 0.4)",
        border: "1px dashed rgba(255, 255, 255, 0.15)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "rgba(255, 255, 255, 0.6)",
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
      });
      this._missionCardEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span>🛰️</span>
          <span>AWAITING MISSION DIRECTIVE // Standby for flight plan assignment</span>
        </div>
        <span style="color:#FBBF24;">LVL 1</span>
      `;
      return;
    }

    const planet = PLANET_VISUALS[obj.id] ?? {
      accentColor: "#38BDF8",
      glowColor: "rgba(56, 189, 248, 0.4)",
      badge: obj.destination.toUpperCase(),
      sprite: "/assets/planets/planet_earth_64.png",
    };

    Object.assign(this._missionCardEl.style, {
      background: "linear-gradient(135deg, rgba(20, 27, 45, 0.7) 0%, rgba(10, 15, 25, 0.85) 100%)",
      border: `1px solid ${planet.accentColor}44`,
      borderRadius: "8px",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
      position: "relative",
      overflow: "hidden",
    });

    // Left block: Planet sprite + Directive details
    const leftBlock = document.createElement("div");
    Object.assign(leftBlock.style, { display: "flex", alignItems: "center", gap: "12px" });

    const planetImg = document.createElement("img");
    planetImg.src = planet.sprite;
    planetImg.alt = obj.destination;
    Object.assign(planetImg.style, {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      boxShadow: `0 0 14px ${planet.glowColor}`,
      flexShrink: "0",
    });

    const infoGroup = document.createElement("div");
    infoGroup.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:9.5px; font-weight:800; font-family:'JetBrains Mono', monospace; background:${planet.accentColor}25; color:${planet.accentColor}; border:1px solid ${planet.accentColor}55; padding:1px 6px; border-radius:4px;">
          MISSION ${obj.id}
        </span>
        <span style="font-size:9.5px; color:rgba(255,255,255,0.5); font-family:'JetBrains Mono', monospace;">
          LVL ${obj.level} // ${planet.badge}
        </span>
      </div>
      <div style="font-size:13.5px; font-weight:700; color:#FFFFFF; margin-top:2px;">
        ${obj.label}
      </div>
      <div style="font-size:10px; color:rgba(255, 255, 255, 0.6); margin-top:1px;">
        Target: ${obj.destination} • Distance: ${obj.distanceKm}
      </div>
    `;
    leftBlock.append(planetImg, infoGroup);

    // Right block: Compact telemetry chips
    const rightBlock = document.createElement("div");
    Object.assign(rightBlock.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontFamily: "'JetBrains Mono', monospace",
    });

    rightBlock.innerHTML = `
      <div style="background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); padding:4px 8px; border-radius:6px; text-align:right;">
        <div style="font-size:8.5px; color:rgba(255,255,255,0.45); text-transform:uppercase;">BUDGET CAP</div>
        <div style="font-size:12px; font-weight:800; color:#FBBF24;">${obj.budget} cr</div>
      </div>
      <div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); padding:4px 8px; border-radius:6px; text-align:right;">
        <div style="font-size:8.5px; color:rgba(255,255,255,0.45); text-transform:uppercase;">SCIENCE GOAL</div>
        <div style="font-size:12px; font-weight:800; color:#38BDF8;">${obj.scienceGoal} pts</div>
      </div>
    `;

    this._missionCardEl.append(leftBlock, rightBlock);
  }

  /**
   * Rebuilds the dynamic content deck (Telemetry Statistics, Carried item bar, Equipment departments, and Actions).
   */
  private _rebuildContent(): void {
    this._contentEl.innerHTML = "";

    const allItems: GameItem[] = [];
    this._snapshot.forEach((e) => {
      const item = getItemById(e.itemId);
      if (item) allItems.push(item);
    });

    const totalMass = allItems.reduce((s, i) => s + i.mass, 0);
    const totalCost = allItems.reduce((s, i) => s + i.cost, 0);
    const totalScience = allItems.reduce((s, i) => s + (i.sciencePoints ?? 0), 0);
    const totalSize = allItems.reduce((s, i) => s + i.size, 0);

    // ── 1. Telemetry Statistics Dashboard Grid ──
    const telemetryGrid = this._buildTelemetryDashboard(totalMass, totalCost, totalScience, totalSize, allItems.length);
    this._contentEl.appendChild(telemetryGrid);

    // ── 2. Carried Item Action Bar (if holding item) ──
    const carriedBar = this._buildCarriedItemBar();
    if (carriedBar) {
      this._contentEl.appendChild(carriedBar);
    }

    // ── 3. Four Specialized Equipment Decks ──
    const decksContainer = document.createElement("div");
    Object.assign(decksContainer.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    const departmentKeys = Object.keys(DEPARTMENTS);
    departmentKeys.forEach((key) => {
      const deckEl = this._buildDepartmentDeck(DEPARTMENTS[key]);
      decksContainer.appendChild(deckEl);
    });
    this._contentEl.appendChild(decksContainer);

    // ── 4. Command Action Deck (AI Consultation, Launch Audit, Verify & Launch) ──
    const commandDeck = this._buildCommandActionDeck(allItems);
    this._contentEl.appendChild(commandDeck);
  }

  /**
   * Builds the 4-gauge Telemetry Dashboard.
   */
  private _buildTelemetryDashboard(
    totalMass: number,
    totalCost: number,
    totalScience: number,
    totalSize: number,
    itemCount: number,
  ): HTMLDivElement {
    const grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "8px",
    });

    const isOverBudget = this._objective !== null && totalCost > this._objective.budget;
    const scienceGoal = this._objective?.scienceGoal ?? 0;
    const isGoalMet = scienceGoal > 0 && totalScience >= scienceGoal;

    // Stat 1: Total Mass
    grid.appendChild(
      this._buildStatModule({
        icon: Layers,
        color: "#38BDF8",
        label: "TOTAL MASS",
        value: `${totalMass} kg`,
        subtext: `${itemCount} units installed`,
        status: "NOMINAL",
        statusColor: "#38BDF8",
      }),
    );

    // Stat 2: Cost / Budget
    grid.appendChild(
      this._buildStatModule({
        icon: Zap,
        color: isOverBudget ? "#F87171" : "#FBBF24",
        label: "COST / BUDGET",
        value: `${totalCost} / ${this._objective?.budget ?? "—"} cr`,
        subtext: isOverBudget ? "BUDGET EXCEEDED" : "WITHIN LIMIT",
        status: isOverBudget ? "OVERFLOW" : "OK",
        statusColor: isOverBudget ? "#F87171" : "#34D399",
      }),
    );

    // Stat 3: Science Points
    grid.appendChild(
      this._buildStatModule({
        icon: Sparkles,
        color: "#34D399",
        label: "SCIENCE POINTS",
        value: `${totalScience} pts`,
        subtext: scienceGoal > 0 ? `Target: ${scienceGoal} pts` : "Standard Payload",
        status: isGoalMet ? "ACHIEVED" : "INCOMPLETE",
        statusColor: isGoalMet ? "#34D399" : "#94A3B8",
      }),
    );

    // Stat 4: Used Space / Bay Capacity
    grid.appendChild(
      this._buildStatModule({
        icon: Maximize2,
        color: "#A78BFA",
        label: "USED SPACE",
        value: `${totalSize} units`,
        subtext: "Internal Compartments",
        status: "CAPACITY",
        statusColor: "#A78BFA",
      }),
    );

    return grid;
  }

  private _buildStatModule(params: {
    icon: any;
    color: string;
    label: string;
    value: string;
    subtext: string;
    status: string;
    statusColor: string;
  }): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "ship-card-hover";
    Object.assign(card.style, {
      background: "linear-gradient(180deg, #131A29 0%, #0E1420 100%)",
      border: "1px solid #1E293B",
      borderTop: `2px solid ${params.color}`,
      borderRadius: "8px",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      fontFamily: "'JetBrains Mono', monospace",
    });

    const topRow = document.createElement("div");
    Object.assign(topRow.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    const labelBox = document.createElement("div");
    Object.assign(labelBox.style, { display: "flex", alignItems: "center", gap: "6px" });
    labelBox.appendChild(createElement(params.icon, { width: 13, height: 13, color: params.color }));
    const lbl = document.createElement("span");
    lbl.textContent = params.label;
    lbl.style.fontSize = "9.5px";
    lbl.style.color = "rgba(255, 255, 255, 0.55)";
    lbl.style.fontWeight = "700";
    labelBox.appendChild(lbl);

    const badge = document.createElement("span");
    badge.textContent = params.status;
    Object.assign(badge.style, {
      fontSize: "8.5px",
      fontWeight: "800",
      color: params.statusColor,
      background: `${params.statusColor}18`,
      border: `1px solid ${params.statusColor}40`,
      borderRadius: "3px",
      padding: "1px 4px",
    });
    topRow.append(labelBox, badge);

    const val = document.createElement("div");
    val.textContent = params.value;
    Object.assign(val.style, {
      fontSize: "14px",
      fontWeight: "800",
      color: "#FFFFFF",
      marginTop: "2px",
      letterSpacing: "0.2px",
    });

    const sub = document.createElement("div");
    sub.textContent = params.subtext;
    Object.assign(sub.style, {
      fontSize: "9px",
      color: "rgba(255, 255, 255, 0.4)",
      marginTop: "1px",
    });

    card.append(topRow, val, sub);
    return card;
  }

  /**
   * Builds the Carried Item Quick-Install Bar if the player is holding an item.
   */
  private _buildCarriedItemBar(): HTMLDivElement | null {
    const held = this._carry.heldItem;
    if (!held) return null;

    const existingCount = [...this._snapshot.values()].filter((e) => e.itemId === held.id).length;
    const atLimit = held.maxPerShip !== null && existingCount >= held.maxPerShip;
    const ownsRole = this._playerRoles.includes(held.roleId);
    const canInstall = ownsRole && !atLimit;

    const bar = document.createElement("div");
    bar.className = "ship-card-hover";
    Object.assign(bar.style, {
      background: canInstall
        ? "linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)"
        : "linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)",
      border: canInstall ? "1.5px solid #10B981" : "1.5px solid #F59E0B",
      borderRadius: "8px",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      boxShadow: canInstall
        ? "0 4px 20px rgba(16, 185, 129, 0.2)"
        : "0 4px 20px rgba(245, 158, 11, 0.2)",
    });

    const leftBox = document.createElement("div");
    Object.assign(leftBox.style, { display: "flex", alignItems: "center", gap: "10px", flex: "1" });

    const iconBadge = document.createElement("div");
    Object.assign(iconBadge.style, {
      width: "32px",
      height: "32px",
      borderRadius: "6px",
      background: canInstall ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
    });
    iconBadge.appendChild(createElement(canInstall ? Plus : AlertTriangle, {
      width: 18,
      height: 18,
      color: canInstall ? "#34D399" : "#FBBF24",
    }));

    const textGroup = document.createElement("div");
    textGroup.innerHTML = `
      <div style="font-size:10px; font-weight:800; color:${canInstall ? '#34D399' : '#FBBF24'}; font-family:'JetBrains Mono', monospace; text-transform:uppercase;">
        🎒 Held in Hands — Ready for Installation
      </div>
      <div style="font-size:12.5px; font-weight:700; color:#FFFFFF; margin-top:1px;">
        ${held.name} (${held.mass} kg · ${held.cost} cr)
      </div>
      <div style="font-size:10px; color:rgba(255, 255, 255, 0.6); font-family:'JetBrains Mono', monospace; margin-top:1px;">
        ${
          atLimit
            ? `⚠️ Cannot install: Maximum of ${held.maxPerShip} per ship reached`
            : !ownsRole
              ? `⚠️ Role mismatch: Requires ${getRoleLabel(held.roleId)} engineer`
              : `Authorized by ${getRoleLabel(held.roleId)}`
        }
      </div>
    `;
    leftBox.append(iconBadge, textGroup);

    // Install Button
    const installBtn = document.createElement("button");
    installBtn.className = "ship-btn-tactile";
    Object.assign(installBtn.style, {
      background: canInstall ? "#10B981" : "#374151",
      border: canInstall ? "1px solid #34D399" : "1px solid #4B5563",
      borderRadius: "6px",
      color: canInstall ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11.5px",
      fontWeight: "800",
      padding: "8px 16px",
      cursor: canInstall ? "pointer" : "not-allowed",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      whiteSpace: "nowrap",
      boxShadow: canInstall ? "0 0 14px rgba(16, 185, 129, 0.4)" : "none",
    });
    installBtn.innerHTML = `<span>${canInstall ? "⚡ Install on Ship" : "⛔ Blocked"}</span>`;

    if (canInstall) {
      installBtn.addEventListener("click", () => {
        SoundFX.playInstallModule();
        const item = this._carry.putDown();
        if (!item) return;

        if (ColyseusService.room) {
          this._pendingCarryAction = { type: "add", item };
          ColyseusService.sendAddItem(item.id, item.roleId);
        } else {
          const localInstanceId = `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          this._snapshot.set(localInstanceId, {
            instanceId: localInstanceId,
            itemId: item.id,
            roleId: item.roleId,
            addedBy: "me",
          });
          this.refresh(this._snapshot);
        }
      });
    }

    bar.append(leftBox, installBtn);
    return bar;
  }

  /**
   * Builds an individual department equipment deck.
   */
  private _buildDepartmentDeck(dept: DepartmentConfig): HTMLDivElement {
    const playerOwnsRole = this._playerRoles.includes(dept.roleId);
    const roleEntries = [...this._snapshot.values()].filter((e) => e.roleId === dept.roleId);

    const deck = document.createElement("div");
    Object.assign(deck.style, {
      background: "linear-gradient(180deg, #101625 0%, #0A0E18 100%)",
      border: "1px solid #1E293B",
      borderLeft: `3px solid ${dept.accentColor}`,
      borderRadius: "8px",
      padding: "10px 14px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });

    // Department Header
    const deptHeader = document.createElement("div");
    Object.assign(deptHeader.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: "6px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    });

    const leftGroup = document.createElement("div");
    Object.assign(leftGroup.style, { display: "flex", alignItems: "center", gap: "8px" });
    leftGroup.appendChild(createElement(dept.icon, { width: 14, height: 14, color: dept.accentColor }));

    const titleEl = document.createElement("span");
    titleEl.textContent = dept.name.toUpperCase();
    Object.assign(titleEl.style, {
      fontSize: "11px",
      fontWeight: "800",
      color: "#FFFFFF",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5px",
    });
    leftGroup.appendChild(titleEl);

    // Right tags: Sector & Count
    const rightGroup = document.createElement("div");
    Object.assign(rightGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "9px",
    });

    const sectorBadge = document.createElement("span");
    sectorBadge.textContent = dept.sectorTag;
    sectorBadge.style.color = "rgba(255, 255, 255, 0.35)";

    const countBadge = document.createElement("span");
    countBadge.textContent = `${roleEntries.length} INSTALLED`;
    Object.assign(countBadge.style, {
      background: roleEntries.length > 0 ? `${dept.accentColor}20` : "rgba(255, 255, 255, 0.05)",
      color: roleEntries.length > 0 ? dept.accentColor : "rgba(255, 255, 255, 0.4)",
      border: `1px solid ${roleEntries.length > 0 ? dept.accentColor + "45" : "rgba(255, 255, 255, 0.1)"}`,
      borderRadius: "4px",
      padding: "2px 6px",
      fontWeight: "700",
    });

    rightGroup.append(sectorBadge, countBadge);
    deptHeader.append(leftGroup, rightGroup);
    deck.appendChild(deptHeader);

    // Empty State
    if (roleEntries.length === 0) {
      const emptyBox = document.createElement("div");
      Object.assign(emptyBox.style, {
        padding: "10px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px dashed rgba(255, 255, 255, 0.1)",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10.5px",
        color: "rgba(255, 255, 255, 0.45)",
      });
      emptyBox.innerHTML = `
        <span style="font-style:italic;">[BAY EMPTY] No components mounted in this department</span>
        <span style="color:${dept.accentColor}88; font-size:9.5px;">Visit Station to retrieve items</span>
      `;
      deck.appendChild(emptyBox);
      return deck;
    }

    // Component Rows List
    const itemsList = document.createElement("div");
    Object.assign(itemsList.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    });

    const totalOfType = new Map<string, number>();
    roleEntries.forEach((e) => {
      totalOfType.set(e.itemId, (totalOfType.get(e.itemId) ?? 0) + 1);
    });
    const seenOfType = new Map<string, number>();

    for (const entry of roleEntries) {
      const item = getItemById(entry.itemId);
      if (!item) continue;

      const copyIndex = (seenOfType.get(entry.itemId) ?? 0) + 1;
      seenOfType.set(entry.itemId, copyIndex);
      const countTotal = totalOfType.get(entry.itemId) ?? 1;

      const row = this._buildItemRow(entry, item, copyIndex, countTotal, playerOwnsRole, dept);
      itemsList.appendChild(row);
    }

    deck.appendChild(itemsList);
    return deck;
  }

  /**
   * Builds an individual component row inside a department deck.
   */
  private _buildItemRow(
    entry: ShipEntrySnapshot,
    item: GameItem,
    copyIndex: number,
    countTotal: number,
    playerOwnsRole: boolean,
    dept: DepartmentConfig,
  ): HTMLDivElement {
    const row = document.createElement("div");
    row.className = "ship-card-hover";
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 10px",
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.07)",
      borderRadius: "6px",
      gap: "8px",
    });

    // Left info
    const leftInfo = document.createElement("div");
    Object.assign(leftInfo.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flex: "1",
      minWidth: "0",
    });

    const itemVis = getItemVisual(item.category);
    const iconPill = document.createElement("div");
    Object.assign(iconPill.style, {
      width: "24px",
      height: "24px",
      borderRadius: "4px",
      background: `${itemVis.color}20`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
    });
    iconPill.appendChild(createElement(itemVis.icon, { width: 14, height: 14, color: itemVis.color }));

    const nameText = document.createElement("div");
    Object.assign(nameText.style, { minWidth: "0", flex: "1" });
    const displayName = countTotal > 1 ? `${item.name} (#${copyIndex})` : item.name;
    nameText.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:#FFFFFF; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${displayName}
      </div>
      <div style="font-size:9.5px; color:rgba(255, 255, 255, 0.45); font-family:'JetBrains Mono', monospace;">
        ${item.id} • ${item.category.toUpperCase()}
      </div>
    `;
    leftInfo.append(iconPill, nameText);

    // Center stats: Mass & Cost
    const statsBlock = document.createElement("div");
    Object.assign(statsBlock.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "10px",
      flexShrink: "0",
    });
    statsBlock.innerHTML = `
      <span style="color:#FDE047; background:rgba(253,224,71,0.1); border:1px solid rgba(253,224,71,0.25); padding:2px 6px; border-radius:4px; font-weight:700;">
        ${item.mass} kg
      </span>
      <span style="color:#34D399; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.25); padding:2px 6px; border-radius:4px; font-weight:700;">
        ${item.cost} cr
      </span>
    `;

    // Right Action Buttons: Specs & Remove
    const btnGroup = document.createElement("div");
    Object.assign(btnGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexShrink: "0",
    });

    // Specs button
    const specsBtn = document.createElement("button");
    specsBtn.className = "ship-btn-tactile";
    Object.assign(specsBtn.style, {
      background: "rgba(56, 189, 248, 0.12)",
      border: "1px solid rgba(56, 189, 248, 0.35)",
      borderRadius: "4px",
      color: "#38BDF8",
      fontSize: "10px",
      fontWeight: "700",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "4px 8px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    });
    specsBtn.appendChild(createElement(Info, { width: 12, height: 12, color: "#38BDF8" }));
    const specsLabel = document.createElement("span");
    specsLabel.textContent = "Specs";
    specsBtn.appendChild(specsLabel);
    specsBtn.addEventListener("click", () => {
      SoundFX.playClick();
      this._openDetail?.close();
      this._openDetail = new ItemDetailUI(item);
      this._openDetail.mount();
    });

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "ship-btn-tactile";
    const canRemove = !this._carry.isHolding && playerOwnsRole;

    Object.assign(removeBtn.style, {
      background: canRemove ? "rgba(248, 113, 113, 0.12)" : "rgba(255, 255, 255, 0.04)",
      border: canRemove ? "1px solid rgba(248, 113, 113, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "4px",
      color: canRemove ? "#F87171" : "rgba(255, 255, 255, 0.3)",
      fontSize: "10px",
      fontWeight: "700",
      fontFamily: "'JetBrains Mono', monospace",
      padding: "4px 8px",
      cursor: canRemove ? "pointer" : "not-allowed",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      opacity: canRemove ? "1" : "0.5",
    });
    removeBtn.disabled = !canRemove;
    removeBtn.appendChild(createElement(Trash2, { width: 12, height: 12, color: canRemove ? "#F87171" : "#888888" }));
    const removeLabel = document.createElement("span");
    removeLabel.textContent = "Remove";
    removeBtn.appendChild(removeLabel);

    if (!canRemove) {
      removeBtn.title = playerOwnsRole
        ? "Hands full: Put down carried item first"
        : `Unauthorized: Requires ${dept.name} role`;
    } else {
      removeBtn.addEventListener("click", () => {
        if (this._carry.isHolding) return;
        SoundFX.playPickup();
        if (ColyseusService.room) {
          this._pendingCarryAction = { type: "remove", item };
          ColyseusService.sendRemoveItem(entry.instanceId, item.id);
        } else {
          this._snapshot.delete(entry.instanceId);
          this.refresh(this._snapshot);
        }
        this._carry.pickUp(item);
      });
    }

    btnGroup.append(specsBtn, removeBtn);
    row.append(leftInfo, statsBlock, btnGroup);
    return row;
  }

  /**
   * Builds the Futuristic Command Action Deck.
   */
  private _buildCommandActionDeck(allItems: GameItem[]): HTMLDivElement {
    const deck = document.createElement("div");
    Object.assign(deck.style, {
      marginTop: "8px",
      paddingTop: "12px",
      borderTop: "1.5px solid #1E293B",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    // Row 1: Consult Flight Director AI Assistant
    if (this._onConsultAi) {
      const aiBtn = document.createElement("button");
      aiBtn.className = "ship-btn-tactile";
      Object.assign(aiBtn.style, {
        background: "linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(167, 139, 250, 0.12) 100%)",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        borderRadius: "8px",
        color: "#FFFFFF",
        fontSize: "12px",
        fontWeight: "700",
        fontFamily: "'JetBrains Mono', monospace",
        padding: "10px 16px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 14px rgba(0, 0, 0, 0.4)",
      });

      const leftAi = document.createElement("div");
      Object.assign(leftAi.style, { display: "flex", alignItems: "center", gap: "8px" });
      leftAi.appendChild(createElement(Activity, { width: 16, height: 16, color: "#38BDF8" }));
      const aiText = document.createElement("span");
      aiText.innerHTML = `<span>EVALUATE WITH FLIGHT DIRECTOR</span> <span style="font-size:10px; color:rgba(255,255,255,0.5);">— AI Autonomous Telemetry Diagnosis</span>`;
      leftAi.appendChild(aiText);

      const sparkle = document.createElement("span");
      sparkle.style.color = "#38BDF8";
      sparkle.textContent = "✨ ASK MCC";
      aiBtn.append(leftAi, sparkle);

      aiBtn.addEventListener("click", () => {
        SoundFX.playRoleSelect();
        this.close();
        this._onConsultAi?.("Can we launch now? Evaluate all 12 rules for our current ship.");
      });

      deck.appendChild(aiBtn);
    }

    // Row 2: Launch Verification & Ignition Actions
    const auditNow = runLaunchChecks(allItems, this._objective);
    const actionRow = document.createElement("div");
    Object.assign(actionRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });

    // Button A: Launch Audit Check
    const auditBtn = document.createElement("button");
    auditBtn.className = "ship-btn-tactile";
    const auditPass = auditNow.success;

    Object.assign(auditBtn.style, {
      flex: "1",
      background: auditPass ? "rgba(52, 211, 153, 0.16)" : "rgba(255, 255, 255, 0.05)",
      border: auditPass ? "1px solid #34D399" : "1px solid rgba(255, 255, 255, 0.18)",
      borderRadius: "8px",
      color: auditPass ? "#34D399" : "#FFFFFF",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "12px",
      fontWeight: "700",
      padding: "12px 16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    });
    auditBtn.appendChild(createElement(CheckCircle2, {
      width: 16,
      height: 16,
      color: auditPass ? "#34D399" : "#94A3B8",
    }));
    const auditLabel = document.createElement("span");
    auditLabel.textContent = `Launch Audit (${auditNow.passCount}/12 Rules)`;
    auditBtn.appendChild(auditLabel);
    auditBtn.addEventListener("click", () => {
      SoundFX.playClick();
      this._openLaunchAuditModal(allItems);
    });
    actionRow.appendChild(auditBtn);

    // Button B: Verify & Launch Ignition (Only Host / Solo)
    if (this._isHost) {
      const launchBtn = document.createElement("button");
      launchBtn.className = "ship-btn-tactile";
      const isReady = auditNow.success;

      Object.assign(launchBtn.style, {
        flex: "1.3",
        background: isReady
          ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
          : "linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(180, 83, 9, 0.22) 100%)",
        border: isReady ? "1.5px solid #34D399" : "1.5px solid #F59E0B",
        borderRadius: "8px",
        color: isReady ? "#FFFFFF" : "#FBBF24",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "12.5px",
        fontWeight: "800",
        letterSpacing: "0.5px",
        padding: "12px 18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        animation: isReady ? "shipLaunchPulse 2.5s infinite" : "none",
      });

      launchBtn.appendChild(createElement(Rocket, {
        width: 17,
        height: 17,
        color: isReady ? "#FFFFFF" : "#FBBF24",
      }));
      const launchText = document.createElement("span");
      launchText.textContent = isReady
        ? "INITIATE LAUNCH SEQUENCE"
        : `VERIFY & LAUNCH (${auditNow.failCount} FAILING)`;
      launchBtn.appendChild(launchText);

      launchBtn.addEventListener("click", () => {
        SoundFX.playClick();
        const result = runLaunchChecks(allItems, this._objective);
        if (!result.success) {
          SoundFX.playError();
          this._openLaunchAuditModal(allItems);
          return;
        }
        this.close();
        this._onLaunchMission?.();
      });

      actionRow.appendChild(launchBtn);
    }

    deck.appendChild(actionRow);
    return deck;
  }

  private _openLaunchAuditModal(allItems: GameItem[]): void {
    if (this._openResult) return;
    const result = runLaunchChecks(allItems, this._objective);
    this._openResult = new LaunchResultUI(
      result,
      () => {
        this._openResult = null;
      },
      (failedResult) => {
        const failingNames = failedResult.checks
          .filter((c) => !c.pass)
          .map((c) => c.label)
          .join(", ");
        this.close();
        this._onConsultAi?.(
          `Our launch audit failed ${failedResult.failCount} rule(s): ${failingNames}. Why are we failing and what exact components should each engineer install next?`,
        );
      },
    );
    this._openResult.mount();
  }
}
