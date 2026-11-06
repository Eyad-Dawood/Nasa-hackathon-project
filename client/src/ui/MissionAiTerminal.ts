import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  createElement,
  Terminal,
  Activity,
  Zap,
  Compass,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide";
import { Theme, getRoleLabel } from "../config/theme";
import { Objective } from "../game/data/ObjectiveData";
import { getItemById } from "../game/data/ItemData";
import { ShipEntity } from "../game/entities/ShipEntity";

interface MessageEntry {
  sender: "ai" | "user";
  content: string;
  timestamp: string;
}

/**
 * MissionAiTerminal
 * ─────────────────
 * Aerospace Telemetry & Mission Flight Director terminal.
 * Unslopped design principles:
 *   - Quiet chrome (tinted ink neutrals, 1px subtle hairlines, zero neon glow).
 *   - Lucide SVG line icons instead of emojis.
 *   - Spacing strictly on a 4px/8px grid.
 *   - Tabular monospace typography for telemetry numbers.
 *   - Clear flight director communications tone.
 */
export class MissionAiTerminal {
  private _container: HTMLDivElement;
  private _messagesContainer!: HTMLDivElement;
  private _telemetryStrip!: HTMLDivElement;
  private _inputEl!: HTMLInputElement;
  private _toggleBtn!: HTMLButtonElement;

  private _objective: Objective | null;
  private _playerRoles: string[];
  private _username: string;
  private _getShipEntity: () => ShipEntity | null;
  private _onFocusChange?: (isFocused: boolean) => void;
  private _onLaunchMission?: () => void;

  private _isOpen: boolean = false;
  private _isTyping: boolean = false;

  constructor(options: {
    objective: Objective | null;
    playerRoles: string[];
    username: string;
    getShipEntity: () => ShipEntity | null;
    onFocusChange?: (isFocused: boolean) => void;
    onLaunchMission?: () => void;
  }) {
    this._objective = options.objective;
    this._playerRoles = options.playerRoles;
    this._username = options.username;
    this._getShipEntity = options.getShipEntity;
    this._onFocusChange = options.onFocusChange;
    this._onLaunchMission = options.onLaunchMission;

    this._container = this._buildDOM();
    this._toggleBtn = this._buildToggleButton();
    this._setupKeyboardShortcut();

    // Initial Telemetry Briefing
    this._addInitialBriefing();
  }

  mount(): void {
    document.body.appendChild(this._toggleBtn);
    document.body.appendChild(this._container);
  }

  destroy(): void {
    this._toggleBtn.remove();
    this._container.remove();
  }

  toggle(): void {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this._isOpen = true;
    this._container.style.display = "flex";
    this.refreshTelemetry();
  }

  close(): void {
    this._isOpen = false;
    this._container.style.display = "none";
    this._onFocusChange?.(false);
  }

  setObjective(obj: Objective): void {
    this._objective = obj;
    this.refreshTelemetry();
    this._streamAiResponse(
      `**Directive Updated:** Now targeting **${obj.label}** (${obj.target}).\n` +
      `Payload limit: **${obj.maxWeight} kg**.\n` +
      `Deploy and balance subsystem units at designated stations.`
    );
  }

  /**
   * Refreshes telemetry counters (Weight, Subsystems, Status).
   */
  refreshTelemetry(): void {
    const ship = this._getShipEntity();
    if (!ship || !this._telemetryStrip) return;

    const items = Array.from(ship.shipItemsSnapshot.values());
    let totalWeight = 0;
    const installedRoleIds = new Set<string>();

    for (const entry of items) {
      const itemDef = getItemById(entry.itemId);
      if (itemDef) {
        totalWeight += itemDef.weight;
      }
      installedRoleIds.add(entry.roleId);
    }

    const maxWeight = this._objective?.maxWeight ?? 220;
    const weightPercent = Math.min(100, Math.round((totalWeight / maxWeight) * 100));
    const subsystemsCount = installedRoleIds.size;

    let statusText = "NOMINAL";
    let statusColor = Theme.colors.success;

    if (items.length === 0) {
      statusText = "STANDBY - 0 MODULES";
      statusColor = Theme.colors.textMuted;
    } else if (totalWeight > maxWeight) {
      statusText = "EXCEEDS MASS BUDGET";
      statusColor = Theme.colors.danger;
    } else if (subsystemsCount < 3) {
      statusText = "INCOMPLETE SUBSYSTEMS";
      statusColor = Theme.colors.warning;
    }

    this._telemetryStrip.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
        <span style="color:${Theme.colors.textSecondary};">Payload Mass: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${totalWeight} kg</b> <span style="color:${Theme.colors.textMuted}; font-size:11px;">/ ${maxWeight} kg</span></span>
        <span style="color:${statusColor}; font-size:11px; font-weight:500; letter-spacing:0.3px;">● ${statusText}</span>
      </div>
      <div style="width:100%; height:4px; background:#121624; border-radius:2px; overflow:hidden;">
        <div style="width:${weightPercent}%; height:100%; background:${weightPercent > 100 ? Theme.colors.danger : Theme.colors.accent}; transition: width 0.25s ease;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:${Theme.colors.textMuted};">
        <span>Units: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${items.length}</b></span>
        <span>Subsystems: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${subsystemsCount}/4</b></span>
        <span>Target: <b style="color:${Theme.colors.textSecondary};">${this._objective?.label ?? "Standard Spacecraft"}</b></span>
      </div>
    `;
  }

  // ── Message Log & Streaming ────────────────────────────────────────────

  private async _streamAiResponse(markdownContent: string): Promise<void> {
    if (this._isTyping) return;
    this._isTyping = true;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "12px 14px",
      background: Theme.colors.surfaceRaised,
      borderRadius: "6px",
      border: `1px solid ${Theme.colors.border}`,
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "11px",
      color: Theme.colors.accent,
      fontFamily: Theme.font.mono,
    });

    const headerTitle = document.createElement("div");
    headerTitle.style.display = "flex";
    headerTitle.style.alignItems = "center";
    headerTitle.style.gap = "6px";
    headerTitle.appendChild(createElement(Terminal, { width: 13, height: 13, "stroke-width": 1.5 }));
    const headerText = document.createElement("span");
    headerText.textContent = "MCC // FLIGHT TELEMETRY";
    headerTitle.appendChild(headerText);

    const timeSpan = document.createElement("span");
    timeSpan.style.color = Theme.colors.textMuted;
    timeSpan.style.fontSize = "10px";
    timeSpan.textContent = new Date().toLocaleTimeString();

    header.append(headerTitle, timeSpan);

    const contentEl = document.createElement("div");
    Object.assign(contentEl.style, {
      fontSize: "13px",
      lineHeight: "1.55",
      color: Theme.colors.textPrimary,
    });

    const cursor = document.createElement("span");
    cursor.className = "ai-cursor";

    row.append(header, contentEl);
    contentEl.appendChild(cursor);
    this._messagesContainer.appendChild(row);

    // Stream words cleanly
    const words = markdownContent.split(" ");
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      accumulated += (i === 0 ? "" : " ") + words[i];
      contentEl.innerHTML = DOMPurify.sanitize(marked.parse(accumulated) as string);
      contentEl.appendChild(cursor);
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
      await new Promise((res) => setTimeout(res, 20));
    }

    cursor.remove();
    this._isTyping = false;
    this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
  }

  private _addQuickUserMessage(text: string): void {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      alignSelf: "flex-end",
      maxWidth: "85%",
      padding: "8px 12px",
      background: "#182030",
      border: `1px solid ${Theme.colors.border}`,
      borderRadius: "6px",
      fontSize: "12px",
      color: Theme.colors.textPrimary,
    });

    const meta = document.createElement("div");
    Object.assign(meta.style, {
      fontSize: "10px",
      color: Theme.colors.textMuted,
      fontFamily: Theme.font.mono,
    });
    meta.textContent = `OPERATOR: ${this._username}`;

    const textEl = document.createElement("div");
    textEl.textContent = text;

    row.append(meta, textEl);
    this._messagesContainer.appendChild(row);
    this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
  }

  // ── Mission Actions ────────────────────────────────────────────────────

  private async _evaluateManifest(): Promise<void> {
    this._addQuickUserMessage("Run telemetry evaluation");
    this.refreshTelemetry();

    const ship = this._getShipEntity();
    if (!ship) {
      await this._streamAiResponse("Sensor link unavailable: Central spacecraft transponder not detected.");
      return;
    }

    const items = Array.from(ship.shipItemsSnapshot.values());
    if (items.length === 0) {
      await this._streamAiResponse(
        `**Status: Cargo Hold Empty (0% readiness)**\n\n` +
        `No structural or functional components installed.\n\n` +
        `**Recommended actions:**\n` +
        `- Power: Install an **Engine Core** or **Fuel Cell** at Station North-West.\n` +
        `- Navigation: Install **Nav System** at Station North-East.\n` +
        `- Transport items and press **E** at the center spacecraft.`
      );
      return;
    }

    let totalWeight = 0;
    const rolesIncluded: Record<string, string[]> = {
      powerAndThermal: [],
      structureAndComputing: [],
      Communications: [],
      Science: [],
    };

    items.forEach((entry) => {
      const itemDef = getItemById(entry.itemId);
      if (itemDef) {
        totalWeight += itemDef.weight;
        if (rolesIncluded[itemDef.roleId]) {
          rolesIncluded[itemDef.roleId].push(itemDef.name);
        }
      }
    });

    const hasPower = rolesIncluded.powerAndThermal.length > 0;
    const hasNav = rolesIncluded.structureAndComputing.length > 0;
    const hasComms = rolesIncluded.Communications.length > 0;
    const hasScience = rolesIncluded.Science.length > 0;

    let report = `**Mission Directive Evaluation**\n`;
    report += `Target: \`${this._objective?.label ?? "Spacecraft Assembly"}\` (${this._objective?.target ?? "Orbit"})\n\n`;

    const maxWeight = this._objective?.maxWeight ?? 220;
    if (totalWeight > maxWeight) {
      report += `**Warning: Mass Limit Exceeded** — Current mass is **${totalWeight} kg** against the **${maxWeight} kg** payload ceiling. Rebalance components before orbital insertion.\n\n`;
    } else {
      report += `**Mass Budget:** **${totalWeight} kg** / ${maxWeight} kg (Nominal).\n\n`;
    }

    report += `**Subsystem Status:**\n`;
    report += `- Power & Propulsion: ${hasPower ? `Verified (${rolesIncluded.powerAndThermal.join(", ")})` : `Offline`}\n`;
    report += `- Guidance & Computing: ${hasNav ? `Verified (${rolesIncluded.structureAndComputing.join(", ")})` : `Incomplete`}\n`;
    report += `- Communications: ${hasComms ? `Verified (${rolesIncluded.Communications.join(", ")})` : `Incomplete`}\n`;
    report += `- Science Payload: ${hasScience ? `Verified (${rolesIncluded.Science.join(", ")})` : `Incomplete`}\n\n`;

    if (hasPower && hasNav && hasComms && hasScience && totalWeight <= 260) {
      report += `**Flight Readiness Verdict:** All primary criteria satisfied. Spacecraft is ready for launch sequence.`;
    } else {
      report += `**Next step:** Coordinate with team to install remaining subsystems.`;
    }

    await this._streamAiResponse(report);
  }

  private async _checkPowerSubsystem(): Promise<void> {
    this._addQuickUserMessage("Check power and thermal systems");
    const ship = this._getShipEntity();
    const items = ship ? Array.from(ship.shipItemsSnapshot.values()) : [];
    const powerItems = items.filter((i) => i.roleId === "powerAndThermal");

    if (powerItems.length === 0) {
      await this._streamAiResponse(
        `**Power Subsystem: Offline**\n\n` +
        `Bus voltage is zero. Without an **Engine Core** or **Fuel Cell**, guidance computers and sensors will lose telemetry upon deployment.\n\n` +
        `Station: North-West quadrant.`
      );
    } else {
      const names = powerItems.map((p) => getItemById(p.itemId)?.name).join(", ");
      await this._streamAiResponse(
        `**Power Subsystem: Nominal**\n\n` +
        `Installed hardware: **${names}**.\n` +
        `Power generation meets electrical load requirements.`
      );
    }
  }

  private async _suggestNextPart(): Promise<void> {
    this._addQuickUserMessage("Suggest next required component");
    const ship = this._getShipEntity();
    const items = ship ? Array.from(ship.shipItemsSnapshot.values()) : [];
    const installedIds = new Set(items.map((i) => i.itemId));

    if (!installedIds.has("engine_core")) {
      await this._streamAiResponse(`**Priority 1:** Install **Engine Core** from Power & Thermal to establish primary electrical bus.`);
      return;
    }
    if (!installedIds.has("nav_system")) {
      await this._streamAiResponse(`**Priority 2:** Install **Nav System** from Structure & Computing for orbital telemetry calculation.`);
      return;
    }
    if (!installedIds.has("hull_plate") && !installedIds.has("shield_gen")) {
      await this._streamAiResponse(`**Priority 3:** Install **Hull Plate** or **Shield Generator** from Communications station for debris mitigation.`);
      return;
    }
    if (!installedIds.has("laser_cannon") && !installedIds.has("targeting_sys")) {
      await this._streamAiResponse(`**Priority 4:** Equip **Science Module** to fulfill data collection criteria.`);
      return;
    }

    await this._streamAiResponse(`All foundational subsystem slots are filled. Check mass budget and proceed to launch review.`);
  }

  private async _handleCustomPrompt(prompt: string): Promise<void> {
    if (!prompt.trim()) return;
    this._addQuickUserMessage(prompt);
    this._inputEl.value = "";

    const lower = prompt.toLowerCase();

    if (lower.includes("weight") || lower.includes("mass") || lower.includes("وزن")) {
      await this._streamAiResponse(
        `**Mass Allowance:** Max **260 kg**.\n` +
        `Heavier components like Armor Slab (70 kg) or Hull Plate (60 kg) rapidly consume allowance. Combine with compact units like Nav System (15 kg) or Fuel Cell (20 kg) to maintain safety margins.`
      );
    } else if (lower.includes("mission") || lower.includes("هدف") || lower.includes("مهمة")) {
      await this._streamAiResponse(
        `**Directive:** \`${this._objective?.label ?? "Exploration Mission"}\`\n\n` +
        `${this._objective?.description ?? "Assemble a functional spacecraft capable of deep space telemetry and scientific research."}`
      );
    } else if (lower.includes("role") || lower.includes("دور")) {
      const roleBadges = this._playerRoles.map((r) => `\`${getRoleLabel(r)}\``).join(", ");
      await this._streamAiResponse(
        `**Assigned Operator Subsystems:** ${roleBadges}\n\n` +
        `Access assigned terminal stations across the bay, retrieve designated modules, and deliver them to the central spacecraft.`
      );
    } else {
      await this._streamAiResponse(
        `Telemetry received: *"${prompt}"*\n\n` +
        `Flight Director advisory: Verify subsystem balance on the top telemetry bar. Maintain power and guidance as foundational requirements before installing secondary hardware.`
      );
    }
  }

  private _addInitialBriefing(): void {
    const roleBadges = this._playerRoles.map((r) => getRoleLabel(r)).join(", ");
    const objName = this._objective?.label ?? "Spacecraft Assembly";

    const content =
      `**MCC // FLIGHT TELEMETRY LINK ONLINE**\n\n` +
      `Operator: \`${this._username}\` | Subsystem Authorization: \`${roleBadges}\`\n` +
      `Active Directive: \`${objName}\`\n\n` +
      `Telemetry link initialized. Verify mass margins and subsystem installation using the quick diagnostics below or query via the console.`;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "12px 14px",
      background: Theme.colors.surfaceRaised,
      borderRadius: "6px",
      border: `1px solid ${Theme.colors.border}`,
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "11px",
      color: Theme.colors.accent,
      fontFamily: Theme.font.mono,
    });

    const headerTitle = document.createElement("div");
    headerTitle.style.display = "flex";
    headerTitle.style.alignItems = "center";
    headerTitle.style.gap = "6px";
    headerTitle.appendChild(createElement(Terminal, { width: 13, height: 13, "stroke-width": 1.5 }));
    const headerText = document.createElement("span");
    headerText.textContent = "MCC // FLIGHT TELEMETRY";
    headerTitle.appendChild(headerText);

    const timeSpan = document.createElement("span");
    timeSpan.style.color = Theme.colors.textMuted;
    timeSpan.style.fontSize = "10px";
    timeSpan.textContent = "INIT";

    header.append(headerTitle, timeSpan);

    const contentEl = document.createElement("div");
    Object.assign(contentEl.style, {
      fontSize: "13px",
      lineHeight: "1.55",
      color: Theme.colors.textPrimary,
    });
    contentEl.innerHTML = DOMPurify.sanitize(marked.parse(content) as string);

    row.append(header, contentEl);
    this._messagesContainer.appendChild(row);
  }

  // ── DOM Construction (Strict Unslopped Layout) ─────────────────────────

  private _buildDOM(): HTMLDivElement {
    const terminal = document.createElement("div");
    terminal.id = "mission-ai-terminal";
    Object.assign(terminal.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "420px",
      height: "540px",
      maxHeight: "82vh",
      maxWidth: "90vw",
      background: "rgba(12, 16, 26, 0.85)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 24px 48px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(20px) saturate(1.5)",
      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
      border: "none",
      borderRadius: "16px",
      display: "none",
      flexDirection: "column",
      zIndex: "2500",
      fontFamily: Theme.font.family,
      overflow: "hidden",
    });

    // 1. Header (Liquid Glass)
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 18px",
      background: "rgba(255, 255, 255, 0.03)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    });

    const titleBox = document.createElement("div");
    Object.assign(titleBox.style, { display: "flex", alignItems: "center", gap: "8px" });

    const titleText = document.createElement("span");
    titleText.textContent = "Flight Director Telemetry";
    Object.assign(titleText.style, {
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      letterSpacing: "0.2px",
    });

    titleBox.append(titleText);

    const closeBtn = document.createElement("button");
    closeBtn.appendChild(createElement(X, { width: 16, height: 16, "stroke-width": 1.5 }));
    Object.assign(closeBtn.style, {
      background: "transparent",
      border: "none",
      color: Theme.colors.textMuted,
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "color 0.15s ease",
    });
    closeBtn.addEventListener("mouseenter", () => (closeBtn.style.color = Theme.colors.textPrimary));
    closeBtn.addEventListener("mouseleave", () => (closeBtn.style.color = Theme.colors.textMuted));
    closeBtn.addEventListener("click", () => this.close());

    header.append(titleBox, closeBtn);

    // 2. Telemetry Strip
    this._telemetryStrip = document.createElement("div");
    Object.assign(this._telemetryStrip.style, {
      padding: "12px 16px",
      background: "#0a0d15",
      borderBottom: `1px solid ${Theme.colors.border}`,
    });

    // 3. Messages Scroll Area
    this._messagesContainer = document.createElement("div");
    Object.assign(this._messagesContainer.style, {
      flex: "1",
      overflowY: "auto",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    // 4. Quick Action Chips (Lucide SVG line icons)
    const chipsBar = document.createElement("div");
    Object.assign(chipsBar.style, {
      display: "flex",
      gap: "8px",
      padding: "8px 16px",
      background: "#080a10",
      borderTop: `1px solid ${Theme.colors.border}`,
      overflowX: "auto",
    });

    const createChip = (label: string, iconComponent: any, onClick: () => void) => {
      const chip = document.createElement("button");
      chip.style.display = "flex";
      chip.style.alignItems = "center";
      chip.style.gap = "6px";
      chip.appendChild(createElement(iconComponent, { width: 13, height: 13, "stroke-width": 1.5 }));
      const labelSpan = document.createElement("span");
      labelSpan.textContent = label;
      chip.appendChild(labelSpan);

      Object.assign(chip.style, {
        background: Theme.colors.surfaceRaised,
        border: `1px solid ${Theme.colors.border}`,
        borderRadius: "4px",
        color: Theme.colors.textSecondary,
        fontSize: "11px",
        fontFamily: Theme.font.family,
        padding: "6px 10px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      });
      chip.addEventListener("mouseenter", () => {
        chip.style.borderColor = Theme.colors.borderHighlight;
        chip.style.color = Theme.colors.textPrimary;
      });
      chip.addEventListener("mouseleave", () => {
        chip.style.borderColor = Theme.colors.border as string;
        chip.style.color = Theme.colors.textSecondary;
      });
      chip.addEventListener("click", onClick);
      return chip;
    };

    chipsBar.append(
      createChip("Evaluate", Activity, () => this._evaluateManifest()),
      createChip("Power", Zap, () => this._checkPowerSubsystem()),
      createChip("Next Step", Compass, () => this._suggestNextPart()),
    );

    // 5. Input Field Row
    const inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      padding: "12px 16px",
      background: "#080a10",
      borderTop: `1px solid ${Theme.colors.border}`,
      gap: "8px",
    });

    this._inputEl = document.createElement("input");
    this._inputEl.placeholder = "Query flight director...";
    Object.assign(this._inputEl.style, {
      flex: "1",
      background: Theme.colors.surfaceRaised,
      border: `1px solid ${Theme.colors.border}`,
      borderRadius: "4px",
      color: Theme.colors.textPrimary,
      fontSize: "12px",
      fontFamily: Theme.font.family,
      padding: "8px 12px",
      outline: "none",
      transition: "border-color 0.15s ease",
    });

    this._inputEl.addEventListener("focus", () => {
      this._inputEl.style.borderColor = Theme.colors.borderHighlight;
      this._onFocusChange?.(true);
    });
    this._inputEl.addEventListener("blur", () => {
      this._inputEl.style.borderColor = Theme.colors.border as string;
      this._onFocusChange?.(false);
    });

    this._inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this._handleCustomPrompt(this._inputEl.value);
      }
    });

    const sendBtn = document.createElement("button");
    sendBtn.appendChild(createElement(Send, { width: 14, height: 14, "stroke-width": 1.5 }));
    Object.assign(sendBtn.style, {
      background: Theme.colors.accent,
      border: "none",
      borderRadius: "4px",
      color: "#080a10",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 14px",
      cursor: "pointer",
      transition: "background 0.15s ease",
    });
    sendBtn.addEventListener("mouseenter", () => (sendBtn.style.background = Theme.colors.accentHover));
    sendBtn.addEventListener("mouseleave", () => (sendBtn.style.background = Theme.colors.accent));
    sendBtn.addEventListener("click", () => this._handleCustomPrompt(this._inputEl.value));

    inputRow.append(this._inputEl, sendBtn);

    terminal.append(header, this._telemetryStrip, this._messagesContainer, chipsBar, inputRow);
    return terminal;
  }

  private _buildToggleButton(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.id = "ai-terminal-toggle-btn";

    const icon = createElement(Terminal, { width: 14, height: 14, "stroke-width": 1.5 });
    const label = document.createElement("span");
    label.textContent = "Telemetry Console";
    label.style.fontWeight = "500";

    const keycap = document.createElement("span");
    keycap.textContent = "TAB";
    Object.assign(keycap.style, {
      fontSize: "9px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "rgba(255, 255, 255, 0.5)",
      background: "rgba(255, 255, 255, 0.08)",
      boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)",
      padding: "2px 6px",
      borderRadius: "4px",
      fontWeight: "600",
    });

    btn.append(icon, label, keycap);

    Object.assign(btn.style, {
      position: "fixed",
      bottom: "18px",
      right: "18px",
      background: "rgba(255, 255, 255, 0.06)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(12px) saturate(1.4)",
      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      border: "none",
      borderRadius: "20px",
      color: "#ffffff",
      padding: "7px 16px",
      fontFamily: Theme.font.family,
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      zIndex: "2400",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.15s ease",
    });

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(255, 255, 255, 0.12)";
      btn.style.boxShadow = "inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(255, 255, 255, 0.06)";
      btn.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)";
    });
    btn.addEventListener("click", () => this.toggle());

    return btn;
  }

  private _setupKeyboardShortcut(): void {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this._isOpen) {
        this.close();
      }
    });
  }
}
