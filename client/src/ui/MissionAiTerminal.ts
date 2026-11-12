import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  createElement,
  Terminal,
  Activity,
  Zap,
  Compass,
  Layers,
  X,
  Send,
  Square,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide";
import { Theme, getRoleLabel } from "../config/theme";
import { Objective } from "../game/data/ObjectiveData";
import { getItemById, GameItem } from "../game/data/ItemData";
import { runLaunchChecks } from "../game/data/LaunchSystem";
import { ShipEntity } from "../game/entities/ShipEntity";
import {
  ClientAiChunkEvent,
  ClientAiDoneEvent,
  ClientAiErrorEvent,
  ClientAiStatusEvent,
  ColyseusService,
} from "../network/ColyseusService";

const ARABIC_CHAR_RX = /[\u0600-\u06FF]/;

export type DroidState = "idle" | "thinking" | "alert" | "ready";

const DROID_AVATARS: Record<DroidState, string> = {
  idle: "/assets/droid/droid_idle.png",
  thinking: "/assets/droid/droid_thinking.png",
  alert: "/assets/droid/droid_alert.png",
  ready: "/assets/droid/droid_ready.png",
};

/**
 * MissionAiTerminal
 * ─────────────────
 * Real-time AI Flight Director & Aerospace Telemetry console.
 * Connected to the authoritative Colyseus GameRoom (`ai:ask`, `ai:cancel`)
 * when online (`ai:status`, `ai:chunk`, `ai:done`, `ai:error`), with RTL
 * Arabic support, streaming Markdown rendering, NASA citations, and verified
 * component recommendations. Falls back cleanly to deterministic offline audit
 * only when playing completely disconnected from a Colyseus GameRoom.
 */
export class MissionAiTerminal {
  private _container: HTMLDivElement;
  private _messagesContainer!: HTMLDivElement;
  private _telemetryStrip!: HTMLDivElement;
  private _statusBanner!: HTMLDivElement;
  private _statusText!: HTMLSpanElement;
  private _cancelBtn!: HTMLButtonElement;
  private _inputEl!: HTMLInputElement;
  private _sendBtn!: HTMLButtonElement;
  private _toggleBtn!: HTMLButtonElement;
  private _droidAvatarImg: HTMLImageElement | null = null;

  private _objective: Objective | null;
  private _playerRoles: string[];
  private _username: string;
  private _getShipEntity: () => ShipEntity | null;
  private _getHeldItemId?: () => string | null;
  private _onFocusChange?: (isFocused: boolean) => void;
  private _onLaunchMission?: () => void;

  private _isOpen: boolean = false;
  private _activeRequestId: string | null = null;
  private _streamAccumulator: string = "";
  private _activeRow: HTMLDivElement | null = null;
  private _activeContentEl: HTMLDivElement | null = null;
  private _activeCursor: HTMLSpanElement | null = null;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _networkUnsubs: Array<() => void> = [];

  constructor(options: {
    objective: Objective | null;
    playerRoles: string[];
    username: string;
    getShipEntity: () => ShipEntity | null;
    getHeldItemId?: () => string | null;
    onFocusChange?: (isFocused: boolean) => void;
    onLaunchMission?: () => void;
  }) {
    this._objective = options.objective;
    this._playerRoles = options.playerRoles;
    this._username = options.username;
    this._getShipEntity = options.getShipEntity;
    this._getHeldItemId = options.getHeldItemId;
    this._onFocusChange = options.onFocusChange;
    this._onLaunchMission = options.onLaunchMission;

    this._ensureStyles();
    this._container = this._buildDOM();
    this._toggleBtn = this._buildToggleButton();
    this._setupKeyboardShortcut();

    this._addInitialBriefing();
  }

  mount(): void {
    document.body.appendChild(this._toggleBtn);
    document.body.appendChild(this._container);
    this.bindNetworkListeners();
  }

  /** Idempotent subscription to Colyseus `ai:*` private streaming events. */
  bindNetworkListeners(): void {
    this._unbindNetworkListeners();

    this._networkUnsubs.push(
      ColyseusService.on("ai:status", (raw) => {
        const ev = raw as ClientAiStatusEvent;
        if (!ev || ev.requestId !== this._activeRequestId) return;
        this._setLiveStatus(ev.label || "Processing...");
      }),
      ColyseusService.on("ai:chunk", (raw) => {
        const ev = raw as ClientAiChunkEvent;
        if (!ev || ev.requestId !== this._activeRequestId) return;
        this._handleIncomingChunk(ev.delta ?? "");
      }),
      ColyseusService.on("ai:done", (raw) => {
        const ev = raw as ClientAiDoneEvent;
        if (!ev || ev.requestId !== this._activeRequestId) return;
        this._handleDoneEvent(ev);
      }),
      ColyseusService.on("ai:error", (raw) => {
        const ev = raw as ClientAiErrorEvent;
        if (!ev || ev.requestId !== this._activeRequestId) return;
        this._handleErrorEvent(ev);
      }),
    );
  }

  /** Dynamically updates the Flight Director Droid avatar state */
  public setDroidState(state: DroidState): void {
    if (this._droidAvatarImg) {
      this._droidAvatarImg.src = DROID_AVATARS[state] || DROID_AVATARS.idle;
    }
  }

  destroy(): void {
    if (this._activeRequestId && ColyseusService.room) {
      ColyseusService.sendAiCancel(this._activeRequestId);
      this._activeRequestId = null;
    }
    this._unbindNetworkListeners();
    if (this._keydownHandler) {
      window.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }
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
    this._inputEl?.blur();
    this._container.style.display = "none";
    this._onFocusChange?.(false);
  }

  askPrompt(prompt: string): void {
    this.open();
    void this._handleCustomPrompt(prompt);
  }

  setObjective(obj: Objective): void {
    this._objective = obj;
    this.refreshTelemetry();
    this._appendStaticCard(
      `**Directive Updated:** Now targeting **${obj.label}** (${obj.destination}).\n` +
        `Budget: **${obj.budget} credits** · Science Goal: **${obj.scienceGoal} pts**.\n` +
        `Coordinate across stations to satisfy all 12 launch rules.`,
    );
  }

  /**
   * Refreshes telemetry counters (Mass, Budget, Launch Checks Status).
   */
  refreshTelemetry(): void {
    const ship = this._getShipEntity();
    if (!ship || !this._telemetryStrip) return;

    const entries = Array.from(ship.shipItemsSnapshot.values());
    const installedItems: GameItem[] = [];
    let totalMass = 0;
    let totalCost = 0;
    const installedRoleIds = new Set<string>();

    for (const entry of entries) {
      const itemDef = getItemById(entry.itemId);
      if (itemDef) {
        installedItems.push(itemDef);
        totalMass += itemDef.mass;
        totalCost += itemDef.cost;
      }
      installedRoleIds.add(entry.roleId);
    }

    const budget = this._objective?.budget ?? 250;
    const costPercent = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;
    const audit = runLaunchChecks(installedItems, this._objective);

    let statusText = `${audit.passCount}/12 RULES PASSING`;
    let statusColor: string = Theme.colors.warning;

    if (entries.length === 0) {
      statusText = "STANDBY - 0 MODULES";
      statusColor = Theme.colors.textMuted;
    } else if (audit.success) {
      statusText = "READY FOR LAUNCH (12/12)";
      statusColor = Theme.colors.success;
    } else if (totalCost > budget) {
      statusText = "OVER BUDGET";
      statusColor = Theme.colors.danger;
    }

    this._telemetryStrip.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
        <span style="color:${Theme.colors.textSecondary};">Budget: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${totalCost}</b> <span style="color:${Theme.colors.textMuted}; font-size:11px;">/ ${budget} cr</span></span>
        <span style="color:${statusColor}; font-size:11px; font-weight:500; letter-spacing:0.3px;">● ${statusText}</span>
      </div>
      <div style="width:100%; height:4px; background:#121624; border-radius:2px; overflow:hidden;">
        <div style="width:${costPercent}%; height:100%; background:${totalCost > budget ? Theme.colors.danger : Theme.colors.accent}; transition: width 0.25s ease;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:${Theme.colors.textMuted};">
        <span>Mass: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${totalMass} kg</b></span>
        <span>Units: <b style="color:${Theme.colors.textPrimary}; font-family:${Theme.font.mono};">${entries.length}</b> (${installedRoleIds.size}/4 depts)</span>
        <span>Target: <b style="color:${Theme.colors.textSecondary};">${this._objective?.destination ?? "Unassigned"}</b></span>
      </div>
    `;
  }

  // ── Network Streaming Handlers ─────────────────────────────────────────

  private _unbindNetworkListeners(): void {
    for (const unsub of this._networkUnsubs) {
      unsub();
    }
    this._networkUnsubs = [];
  }

  private _startAiRequest(prompt: string, languageHint?: "en" | "ar"): void {
    // Cancel any overlapping active query before opening a new stream
    if (this._activeRequestId) {
      ColyseusService.sendAiCancel(this._activeRequestId);
      this._finalizeInterruptedBubble();
    }

    const requestId = `fd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this._activeRequestId = requestId;
    this._streamAccumulator = "";

    const { row, contentEl, cursor } = this._createAiBubble("MCC-HOUSTON // LIVE LINK", "thinking");
    this._activeRow = row;
    this._activeContentEl = contentEl;
    this._activeCursor = cursor;
    this._messagesContainer.appendChild(row);
    this._scrollBottom();

    this.setDroidState("thinking");
    this._setLiveStatus("Connecting to MCC-Houston Flight Director...");

    const detectedLang: "en" | "ar" | undefined =
      languageHint ?? (ARABIC_CHAR_RX.test(prompt) ? "ar" : undefined);

    ColyseusService.sendAiAsk({
      requestId,
      message: prompt,
      localHeldItemId: this._getHeldItemId?.() ?? null,
      languageHint: detectedLang,
    });
  }

  private _cancelActiveRequest(): void {
    if (!this._activeRequestId) return;
    const reqId = this._activeRequestId;
    if (ColyseusService.room) {
      ColyseusService.sendAiCancel(reqId);
    }
    this._setLiveStatus("Cancelling request...");
  }

  private _handleIncomingChunk(delta: string): void {
    if (!delta || !this._activeContentEl) return;
    this._streamAccumulator += delta;
    this._renderMarkdownInto(this._activeContentEl, this._streamAccumulator, true);
    if (this._activeCursor) {
      this._activeContentEl.appendChild(this._activeCursor);
    }
    this._scrollBottom();
  }

  private _handleDoneEvent(ev: ClientAiDoneEvent): void {
    const contentEl = this._activeContentEl;
    const row = this._activeRow;
    this._activeCursor?.remove();
    this._activeRequestId = null;
    this._activeCursor = null;
    this._activeContentEl = null;
    this._activeRow = null;
    this._setLiveStatus(null);
    this.setDroidState(ev.code === "ABORTED" ? "idle" : "alert");

    if (!contentEl || !row) return;

    const finalMarkdown = ev.fullText?.trim() || this._streamAccumulator.trim();
    const isRtl = ev.metadata?.language === "ar" || ARABIC_CHAR_RX.test(finalMarkdown);
    this._renderMarkdownInto(contentEl, finalMarkdown, false, isRtl ? "rtl" : "ltr");

    // Structured verification telemetry & citations footer
    const meta = ev.metadata;
    if (meta?.passCount === 12) {
      this.setDroidState("ready");
    } else {
      this.setDroidState("idle");
    }
    if (meta) {
      const footer = document.createElement("div");
      Object.assign(footer.style, {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginTop: "6px",
        paddingTop: "8px",
        borderTop: `1px solid ${Theme.colors.border}`,
      });

      const badgeLine = document.createElement("div");
      Object.assign(badgeLine.style, {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px",
        fontSize: "10px",
        fontFamily: Theme.font.mono,
        color: Theme.colors.textMuted,
      });

      const provTag = document.createElement("span");
      provTag.textContent = `${meta.provider.toUpperCase()} // ${meta.model}`;
      provTag.style.color = meta.provider === "gemini" ? Theme.colors.success : Theme.colors.accent;
      badgeLine.appendChild(provTag);

      if (meta.passCount !== null) {
        const auditTag = document.createElement("span");
        auditTag.textContent = `· ${meta.passCount}/${meta.totalRules} rules`;
        auditTag.style.color = meta.launchReady ? Theme.colors.success : Theme.colors.warning;
        badgeLine.appendChild(auditTag);
      }

      if (meta.toolsCalled?.length > 0) {
        const toolsTag = document.createElement("span");
        toolsTag.textContent = `· tools: ${meta.toolsCalled.length}`;
        badgeLine.appendChild(toolsTag);
      }

      if (typeof meta.latencyMs === "number") {
        const latTag = document.createElement("span");
        latTag.textContent = `· ${(meta.latencyMs / 1000).toFixed(1)}s`;
        badgeLine.appendChild(latTag);
      }

      footer.appendChild(badgeLine);

      if (Array.isArray(meta.recommendations) && meta.recommendations.length > 0) {
        const recWrap = document.createElement("div");
        Object.assign(recWrap.style, {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        });

        for (const rec of meta.recommendations.slice(0, 4)) {
          const pill = document.createElement("span");
          Object.assign(pill.style, {
            fontSize: "10px",
            fontFamily: Theme.font.mono,
            padding: "3px 7px",
            borderRadius: "4px",
            background: "rgba(112, 161, 255, 0.12)",
            border: "1px solid rgba(112, 161, 255, 0.28)",
            color: Theme.colors.textSecondary,
          });
          pill.textContent = `${rec.action === "remove" ? "-" : "+"}${rec.quantity} ${rec.componentId} ${rec.componentName} (${rec.cost} cr)`;
          pill.title = `${rec.roleLabel} — ${rec.stationQuadrant}: ${rec.reason}`;
          recWrap.appendChild(pill);
        }
        footer.appendChild(recWrap);
      }

      if (Array.isArray(meta.citations) && meta.citations.length > 0) {
        const citeWrap = document.createElement("div");
        Object.assign(citeWrap.style, {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        });

        for (const cite of meta.citations.slice(0, 3)) {
          if (!cite.url || !cite.url.startsWith("https://")) continue;
          const link = document.createElement("a");
          link.href = cite.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          Object.assign(link.style, {
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            color: Theme.colors.accent,
            textDecoration: "none",
          });
          link.appendChild(createElement(BookOpen, { width: 11, height: 11, "stroke-width": 1.5 }));
          const span = document.createElement("span");
          span.textContent = `${cite.organization}: ${cite.title}`;
          link.appendChild(span);
          citeWrap.appendChild(link);
        }
        if (citeWrap.childElementCount > 0) {
          footer.appendChild(citeWrap);
        }
      }

      if (Array.isArray(meta.warnings) && meta.warnings.length > 0) {
        const warnLine = document.createElement("div");
        warnLine.style.fontSize = "10px";
        warnLine.style.color = Theme.colors.warning;
        warnLine.textContent = `Guardrail notice: ${meta.warnings.join(" ")}`;
        footer.appendChild(warnLine);
      }

      row.appendChild(footer);
    }

    this._scrollBottom();
  }

  private _handleErrorEvent(ev: ClientAiErrorEvent): void {
    const contentEl = this._activeContentEl;
    const row = this._activeRow;
    this._activeCursor?.remove();
    this._activeRequestId = null;
    this._activeCursor = null;
    this._activeContentEl = null;
    this._activeRow = null;
    this._setLiveStatus(null);
    this.setDroidState(ev.code === "ABORTED" ? "idle" : "alert");

    if (!contentEl || !row) return;

    row.style.borderColor =
      ev.code === "ABORTED" ? Theme.colors.border : Theme.colors.danger;

    const msgBox = document.createElement("div");
    Object.assign(msgBox.style, {
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
      color: ev.code === "ABORTED" ? Theme.colors.textMuted : Theme.colors.danger,
      fontSize: "12px",
    });
    msgBox.appendChild(
      createElement(AlertCircle, { width: 14, height: 14, "stroke-width": 1.5 }),
    );
    const textSpan = document.createElement("span");
    textSpan.textContent =
      ev.code === "ABORTED"
        ? "Flight Director request cancelled."
        : `[${ev.code}] ${ev.message}`;
    msgBox.appendChild(textSpan);

    contentEl.innerHTML = "";
    contentEl.appendChild(msgBox);
    this._scrollBottom();
  }

  private _finalizeInterruptedBubble(): void {
    this._activeCursor?.remove();
    this._activeRequestId = null;
    this._activeCursor = null;
    if (this._activeContentEl && !this._streamAccumulator.trim()) {
      this._activeContentEl.textContent = "Superseded by newer Flight Director request.";
      this._activeContentEl.style.color = Theme.colors.textMuted;
    }
    this._activeContentEl = null;
    this._activeRow = null;
    this._setLiveStatus(null);
    this.setDroidState(ev.code === "ABORTED" ? "idle" : "alert");
  }

  // ── UI Rendering Helpers ───────────────────────────────────────────────

  private _renderMarkdownInto(
    el: HTMLDivElement,
    markdown: string,
    keepCursor = false,
    forcedDir?: "rtl" | "ltr",
  ): void {
    const dir = forcedDir ?? (ARABIC_CHAR_RX.test(markdown) ? "rtl" : "ltr");
    el.dir = dir;
    el.style.textAlign = dir === "rtl" ? "right" : "left";

    const parsedHtml = marked.parse(markdown) as string;
    el.innerHTML = DOMPurify.sanitize(parsedHtml, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "a",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    // Enforce safe external links
    el.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      anchor.style.color = Theme.colors.accent;
    });

    if (keepCursor && this._activeCursor) {
      el.appendChild(this._activeCursor);
    }
  }

  private _createAiBubble(headerLabel: string, droidState: DroidState = "idle"): {
    row: HTMLDivElement;
    contentEl: HTMLDivElement;
    cursor: HTMLSpanElement;
  } {
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
    headerTitle.style.gap = "8px";

    const bubbleDroid = document.createElement("img");
    bubbleDroid.src = DROID_AVATARS[droidState] || DROID_AVATARS.idle;
    Object.assign(bubbleDroid.style, {
      width: "18px",
      height: "18px",
      imageRendering: "pixelated",
    });
    headerTitle.appendChild(bubbleDroid);

    const headerText = document.createElement("span");
    headerText.textContent = headerLabel;
    headerTitle.appendChild(headerText);

    const timeSpan = document.createElement("span");
    timeSpan.style.color = Theme.colors.textMuted;
    timeSpan.style.fontSize = "10px";
    timeSpan.textContent = new Date().toLocaleTimeString();

    header.append(headerTitle, timeSpan);

    const contentEl = document.createElement("div");
    contentEl.className = "ai-markdown-body";
    Object.assign(contentEl.style, {
      fontSize: "13px",
      lineHeight: "1.55",
      color: Theme.colors.textPrimary,
      wordBreak: "break-word",
    });

    const cursor = document.createElement("span");
    cursor.className = "ai-cursor";

    row.append(header, contentEl);
    contentEl.appendChild(cursor);
    return { row, contentEl, cursor };
  }

  private _appendStaticCard(markdownContent: string, headerLabel = "MCC // FLIGHT TELEMETRY"): void {
    const { row, contentEl, cursor } = this._createAiBubble(headerLabel);
    cursor.remove();
    this._renderMarkdownInto(contentEl, markdownContent, false);
    this._messagesContainer.appendChild(row);
    this._scrollBottom();
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
    const isAr = ARABIC_CHAR_RX.test(text);
    textEl.dir = isAr ? "rtl" : "ltr";
    textEl.style.textAlign = isAr ? "right" : "left";
    textEl.textContent = text;

    row.append(meta, textEl);
    this._messagesContainer.appendChild(row);
    this._scrollBottom();
  }

  private _setLiveStatus(label: string | null): void {
    if (!this._statusBanner || !this._statusText || !this._cancelBtn) return;
    if (!label) {
      this._statusBanner.style.display = "none";
      return;
    }
    this._statusText.textContent = label;
    this._statusBanner.style.display = "flex";
  }

  private _scrollBottom(): void {
    if (this._messagesContainer) {
      this._messagesContainer.scrollTop = this._messagesContainer.scrollHeight;
    }
  }

  // ── Quick Actions & Custom Queries ─────────────────────────────────────

  private _evaluateManifest(): void {
    void this._handleCustomPrompt(
      "Can we launch now? Run a full 12-rule launch audit and diagnose any failing rules.",
    );
  }

  private _checkPowerSubsystem(): void {
    void this._handleCustomPrompt(
      "Diagnose our power generation, night battery storage, and thermal protection for this mission.",
    );
  }

  private _suggestNextPart(): void {
    void this._handleCustomPrompt(
      "What is the best next component to install, and what should I collect for my role?",
    );
  }

  private _buildFullPlan(): void {
    void this._handleCustomPrompt(
      "Find a verified feasible build plan within budget to satisfy all 12 launch rules.",
    );
  }

  private async _handleCustomPrompt(prompt: string): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    this._addQuickUserMessage(trimmed);
    this._inputEl.value = "";
    this.refreshTelemetry();

    // Live Colyseus multiplayer room -> real AI Flight Director (Gemini / configured provider)
    if (ColyseusService.room && ColyseusService.room.name === "game") {
      this._startAiRequest(trimmed);
      return;
    }

    // Disconnected / offline local play fallback -> honest deterministic local audit only
    this._runOfflineDeterministicFallback();
  }

  private _runOfflineDeterministicFallback(): void {
    const ship = this._getShipEntity();
    if (!ship) {
      this._appendStaticCard(
        "Sensor link unavailable: Join a multiplayer GameRoom to consult MCC-Houston Gemini Flight Director.",
        "OFFLINE TELEMETRY",
      );
      return;
    }

    const entries = Array.from(ship.shipItemsSnapshot.values());
    const installedItems: GameItem[] = entries
      .map((e) => getItemById(e.itemId))
      .filter((x): x is GameItem => Boolean(x));
    const totalMass = installedItems.reduce((s, i) => s + i.mass, 0);
    const totalCost = installedItems.reduce((s, i) => s + i.cost, 0);
    const audit = runLaunchChecks(installedItems, this._objective);
    const failed = audit.checks.filter((c) => !c.pass);

    let report =
      `> *Offline Mode:* Not connected to a live Colyseus GameRoom. Showing deterministic local audit only.\n\n` +
      `**Target:** \`${this._objective?.label ?? "Unselected"}\` · Mass: **${totalMass} kg** · Cost: **${totalCost}/${this._objective?.budget ?? "—"} cr**\n` +
      `**Launch Audit:** **${audit.passCount}/12** checks passed.\n`;

    if (failed.length > 0) {
      report +=
        `\n**Failing Rules:**\n` +
        failed.map((f) => `- ${f.label}: ${f.actual} (needed ${f.required})`).join("\n");
    } else {
      report += `\nAll 12 rules satisfied for launch.`;
    }

    this._appendStaticCard(report, "OFFLINE TELEMETRY");
  }

  private _addInitialBriefing(): void {
    const roleBadges = this._playerRoles.map((r) => getRoleLabel(r)).join(", ");
    const objName = this._objective?.label ?? "Spacecraft Assembly";
    const isOnline = ColyseusService.room?.name === "game";

    const content =
      `**MCC-HOUSTON // FLIGHT TELEMETRY LINK ${isOnline ? "ONLINE" : "STANDBY"}**\n\n` +
      `Operator: \`${this._username}\` | Authorization: \`${roleBadges}\`\n` +
      `Directive: \`${objName}\`\n\n` +
      `Ask in **English or Arabic** about launch readiness, component trade-offs, NASA mission science, or run a 12-rule build plan below.`;

    this._appendStaticCard(content, "INIT // FLIGHT TELEMETRY");
  }

  // ── DOM Construction ───────────────────────────────────────────────────

  private _ensureStyles(): void {
    if (document.getElementById("mission-ai-terminal-styles")) return;
    const style = document.createElement("style");
    style.id = "mission-ai-terminal-styles";
    style.textContent = `
      @keyframes aiCursorBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .ai-cursor {
        display: inline-block;
        width: 7px;
        height: 13px;
        margin-left: 3px;
        vertical-align: text-bottom;
        background: ${Theme.colors.accent};
        animation: aiCursorBlink 0.9s steps(1) infinite;
      }
      .ai-markdown-body p { margin: 0 0 8px 0; }
      .ai-markdown-body p:last-child { margin-bottom: 0; }
      .ai-markdown-body ul, .ai-markdown-body ol { margin: 4px 0 8px 0; padding-inline-start: 18px; }
      .ai-markdown-body li { margin-bottom: 3px; }
      .ai-markdown-body code {
        font-family: ${Theme.font.mono};
        font-size: 11.5px;
        background: rgba(255, 255, 255, 0.08);
        padding: 1px 5px;
        border-radius: 3px;
      }
      .ai-markdown-body blockquote {
        margin: 6px 0;
        padding: 6px 10px;
        border-inline-start: 2px solid ${Theme.colors.warning};
        background: rgba(251, 191, 36, 0.08);
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  private _buildDOM(): HTMLDivElement {
    const terminal = document.createElement("div");
    terminal.id = "mission-ai-terminal";
    Object.assign(terminal.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "440px",
      height: "560px",
      maxHeight: "82vh",
      maxWidth: "92vw",
      background: "rgba(12, 16, 26, 0.88)",
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 24px 48px rgba(0, 0, 0, 0.6)",
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

    // 1. Header
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
    Object.assign(titleBox.style, { display: "flex", alignItems: "center", gap: "10px" });

    const droidAvatar = document.createElement("img");
    droidAvatar.src = DROID_AVATARS.idle;
    droidAvatar.alt = "Flight Director Droid";
    Object.assign(droidAvatar.style, {
      width: "28px",
      height: "28px",
      imageRendering: "pixelated",
      borderRadius: "4px",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      background: "#080C14",
    });
    this._droidAvatarImg = droidAvatar;

    const titleText = document.createElement("span");
    titleText.textContent = "Flight Director Telemetry";
    Object.assign(titleText.style, {
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "600",
      letterSpacing: "0.2px",
    });
    titleBox.append(droidAvatar, titleText);

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

    // 3b. Live Status & Cancel Strip (visible during streaming)
    this._statusBanner = document.createElement("div");
    Object.assign(this._statusBanner.style, {
      display: "none",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "6px 16px",
      background: "rgba(56, 189, 248, 0.08)",
      borderTop: `1px solid rgba(56, 189, 248, 0.25)`,
      fontSize: "11px",
      fontFamily: Theme.font.mono,
      color: Theme.colors.accent,
    });

    const statusLeft = document.createElement("div");
    Object.assign(statusLeft.style, { display: "flex", alignItems: "center", gap: "6px", flex: "1", minWidth: "0" });
    statusLeft.appendChild(createElement(CheckCircle2, { width: 12, height: 12, "stroke-width": 1.5 }));
    this._statusText = document.createElement("span");
    Object.assign(this._statusText.style, {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    statusLeft.appendChild(this._statusText);

    this._cancelBtn = document.createElement("button");
    this._cancelBtn.style.display = "flex";
    this._cancelBtn.style.alignItems = "center";
    this._cancelBtn.style.gap = "4px";
    this._cancelBtn.appendChild(createElement(Square, { width: 10, height: 10, "stroke-width": 2 }));
    const cancelText = document.createElement("span");
    cancelText.textContent = "Cancel";
    this._cancelBtn.appendChild(cancelText);
    Object.assign(this._cancelBtn.style, {
      background: "rgba(248, 113, 113, 0.14)",
      border: `1px solid ${Theme.colors.danger}`,
      borderRadius: "4px",
      color: Theme.colors.danger,
      fontSize: "10px",
      fontFamily: Theme.font.mono,
      padding: "3px 8px",
      cursor: "pointer",
      flexShrink: "0",
    });
    this._cancelBtn.addEventListener("click", () => this._cancelActiveRequest());

    this._statusBanner.append(statusLeft, this._cancelBtn);

    // 4. Quick Action Chips
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
      createChip("Build Plan", Layers, () => this._buildFullPlan()),
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
    this._inputEl.placeholder = "Ask MCC-Houston (English or العربية)...";
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
        e.preventDefault();
        e.stopPropagation();
        void this._handleCustomPrompt(this._inputEl.value);
      } else if (e.key !== "Tab" && e.key !== "Escape") {
        e.stopPropagation();
      }
    });

    this._sendBtn = document.createElement("button");
    this._sendBtn.appendChild(createElement(Send, { width: 14, height: 14, "stroke-width": 1.5 }));
    Object.assign(this._sendBtn.style, {
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
    this._sendBtn.addEventListener("mouseenter", () => (this._sendBtn.style.background = Theme.colors.accentHover));
    this._sendBtn.addEventListener("mouseleave", () => (this._sendBtn.style.background = Theme.colors.accent));
    this._sendBtn.addEventListener("click", () => void this._handleCustomPrompt(this._inputEl.value));

    inputRow.append(this._inputEl, this._sendBtn);

    terminal.append(
      header,
      this._telemetryStrip,
      this._messagesContainer,
      this._statusBanner,
      chipsBar,
      inputRow,
    );
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
      boxShadow:
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)",
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
      btn.style.boxShadow =
        "inset 0 1px 0.5px rgba(255, 255, 255, 0.2), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)";
    });
    btn.addEventListener("click", () => this.toggle());

    return btn;
  }

  private _setupKeyboardShortcut(): void {
    this._keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this._isOpen) {
        this.close();
      }
    };
    window.addEventListener("keydown", this._keydownHandler);
  }
}
