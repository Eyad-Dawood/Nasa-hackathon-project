import { Theme } from "../config/theme";
import { ColyseusService } from "../network/ColyseusService";
import { RolePicker } from "./RolePicker";
import { ALL_ROLE_IDS, RoleId } from "../config/theme";

/**
 * LobbyRoomPanel
 * ──────────────
 * In-lobby view: shows all connected players, role picker, and start button.
 * Mounts as a DOM overlay on top of the Phaser canvas.
 *
 * Usage:
 *   const panel = new LobbyRoomPanel(sessionId, isHost, onGameStart);
 *   panel.mount();
 *   // Update with every state change:
 *   panel.refresh(players);
 *   panel.destroy();
 */

interface PlayerInfo {
  id: string;
  username: string;
  roles: string[];
  ready: boolean;
}

export class LobbyRoomPanel {
  private container: HTMLDivElement;
  private sessionId: string;
  private isHost: boolean;
  private onGameStart: (gameRoomId: string) => void;
  private rolePicker!: RolePicker;
  private playerListEl!: HTMLDivElement;
  private startBtn!: HTMLButtonElement;
  private startError!: HTMLSpanElement;
  private unsubGameStarted: (() => void) | null = null;
  private unsubRoleError: (() => void) | null = null;
  private unsubStartError: (() => void) | null = null;
  private hasAutoClaimedRoles: boolean = false;

  constructor(sessionId: string, isHost: boolean, onGameStart: (gameRoomId: string) => void) {
    this.sessionId = sessionId;
    this.isHost = isHost;
    this.onGameStart = onGameStart;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);

    // Listen for game-started event from server (payload contains gameRoomId)
    this.unsubGameStarted = ColyseusService.on("game-started", (data: unknown) => {
      const { gameRoomId } = data as { gameRoomId: string };
      this.destroy();
      this.onGameStart(gameRoomId);
    });

    // Listen for server-side role errors
    this.unsubRoleError = ColyseusService.on("roleError", (data: unknown) => {
      const msg = (data as { message: string }).message;
      this.startError.textContent = msg;
      setTimeout(() => {
        this.startError.textContent = "";
      }, 3000);
    });

    // Listen for start errors
    this.unsubStartError = ColyseusService.on("startError", (data: unknown) => {
      const msg = (data as { message: string }).message;
      this.startError.textContent = msg;
      setTimeout(() => {
        this.startError.textContent = "";
      }, 4000);
    });
  }

  destroy(): void {
    this.unsubGameStarted?.();
    this.unsubRoleError?.();
    this.unsubStartError?.();
    this.container.remove();
  }

  /**
   * Refresh the panel with the current room state.
   * Call this every time `room.onStateChange` fires.
   */
  refresh(players: Map<string, PlayerInfo>, hostId: string): void {
    this.isHost = this.sessionId === hostId;

    this.startBtn.style.display = this.isHost ? "block" : "none";

    const hostNote = this.container.querySelector("p");
    if (hostNote) {
      hostNote.style.display = this.isHost ? "none" : "block";
    }

    // Update player list
    this.playerListEl.innerHTML = "";
    players.forEach((player) => {
      const row = this._buildPlayerRow(player, player.id === hostId);
      this.playerListEl.appendChild(row);
    });

    // Build role assignments map for RolePicker
    const assignments = Object.fromEntries(
      ALL_ROLE_IDS.map((rid) => [rid, null as string | null]),
    ) as Record<RoleId, string | null>;

    players.forEach((player) => {
      player.roles.forEach((role) => {
        if (ALL_ROLE_IDS.includes(role as RoleId)) {
          assignments[role as RoleId] = player.id;
        }
      });
    });

    this.rolePicker.refresh(assignments);

    // Auto-claim all 4 roles when playing solo or host testing so user doesn't have to manually click all 4
    if (this.isHost && !this.hasAutoClaimedRoles && players.size === 1) {
      this.hasAutoClaimedRoles = true;
      ALL_ROLE_IDS.forEach((rid) => {
        if (assignments[rid] === null) {
          ColyseusService.send("setRole", { role: rid, claim: true });
        }
      });
    }

    // Enable start button only if all 4 roles are assigned
    const allAssigned = ALL_ROLE_IDS.every((rid) => assignments[rid] !== null);
    if (allAssigned) {
      this.startBtn.disabled = false;
      this.startBtn.style.background = "#ffffff";
      this.startBtn.style.color = "#04060a";
      this.startBtn.style.border = "none";
      this.startBtn.style.boxShadow = "0 4px 24px rgba(255, 255, 255, 0.3), inset 0 1px 1px #ffffff";
      this.startBtn.style.cursor = "pointer";
      this.startBtn.textContent = "Authorize Mission Launch";
    } else {
      const remaining = ALL_ROLE_IDS.filter(
        (rid) => assignments[rid] === null,
      ).length;
      this.startBtn.disabled = true;
      this.startBtn.style.background = "rgba(255, 255, 255, 0.04)";
      this.startBtn.style.color = "rgba(255, 255, 255, 0.3)";
      this.startBtn.style.border = "none";
      this.startBtn.style.boxShadow = "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)";
      this.startBtn.style.cursor = "not-allowed";
      this.startBtn.textContent = `Authorize Launch (${remaining} unassigned)`;
    }
  }

  private _buildPlayerRow(
    player: PlayerInfo,
    isHostPlayer: boolean,
  ): HTMLDivElement {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 14px",
      background: "rgba(255, 255, 255, 0.04)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      backdropFilter: "blur(12px) saturate(1.4)",
      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      borderRadius: "12px",
      transition: "all 0.15s ease",
    });

    const left = document.createElement("div");
    Object.assign(left.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      minWidth: "0",
    });

    const name = document.createElement("span");
    name.textContent = player.username;
    name.style.color = "#ffffff";
    name.style.fontSize = "14px";
    name.style.fontWeight = "600";
    name.style.whiteSpace = "nowrap";

    left.appendChild(name);

    if (isHostPlayer) {
      const hostBadge = document.createElement("span");
      hostBadge.textContent = "HOST";
      Object.assign(hostBadge.style, {
        background: "rgba(255, 255, 255, 0.12)",
        boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.25), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)",
        borderRadius: "6px",
        color: "#ffffff",
        fontSize: "10px",
        fontWeight: "600",
        padding: "2px 7px",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.5px",
        flexShrink: "0",
      });
      left.appendChild(hostBadge);
    }

    const right = document.createElement("div");
    Object.assign(right.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "5px",
      alignItems: "center",
      justifyContent: "flex-end",
    });

    if (player.roles.length > 0) {
      player.roles.forEach((r) => {
        const roleDef = Theme.roles.find((d) => d.id === r);
        const chip = document.createElement("span");
        chip.textContent = roleDef ? roleDef.label.replace("And", "&") : r;
        Object.assign(chip.style, {
          background: "rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.18), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
          borderRadius: "6px",
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: "11px",
          fontWeight: "500",
          padding: "3px 8px",
          whiteSpace: "nowrap",
        });
        right.appendChild(chip);
      });
    } else {
      const pending = document.createElement("span");
      pending.textContent = "Selecting station…";
      pending.style.color = "rgba(255, 255, 255, 0.35)";
      pending.style.fontSize = "12px";
      right.appendChild(pending);
    }

    row.append(left, right);
    return row;
  }

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "lobby-room-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end", // Dock to the dark Earth area on the right
      paddingRight: "min(8vw, 96px)",
      paddingLeft: "24px",
      boxSizing: "border-box",
      background: "transparent",
      zIndex: "1000",
      fontFamily: font.family,
      pointerEvents: "none",
    });

    // Floating frameless container - NO enclosed card box!
    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "transparent",
      border: "none",
      boxShadow: "none",
      padding: "0",
      width: "480px",
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      pointerEvents: "auto",
    });

    // Top Mission Telemetry Tag - Monochrome Glisse
    const tag = document.createElement("div");
    Object.assign(tag.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.45)",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
    });
    tag.innerHTML = `
      <span>CREW MANIFEST &middot; MISSION STAGING</span>
      <span style="color: rgba(255,255,255,0.35);">ORBITAL BAY ACTIVE</span>
    `;

    // Header
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    });

    const titleBlock = document.createElement("div");
    titleBlock.style.display = "flex";
    titleBlock.style.flexDirection = "column";
    titleBlock.style.gap = "4px";

    const title = document.createElement("h1");
    title.textContent = "Flight Operations";
    Object.assign(title.style, {
      background: "linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.65) 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontSize: "38px",
      margin: "0",
      letterSpacing: "-0.6px",
      fontWeight: "700",
      lineHeight: "1.1",
    });

    const roomSub = document.createElement("span");
    roomSub.textContent = "Configure crew roles before pre-flight authorization";
    roomSub.style.color = "rgba(255, 255, 255, 0.45)";
    roomSub.style.fontSize = "13px";

    titleBlock.append(title, roomSub);

    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "Abort & Leave";
    Object.assign(leaveBtn.style, {
      background: "rgba(255, 255, 255, 0.06)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.18), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
      border: "none",
      borderRadius: "8px",
      color: "rgba(255, 255, 255, 0.7)",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: "12px",
      fontWeight: "500",
      padding: "6px 14px",
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
    });
    leaveBtn.addEventListener("mouseenter", () => {
      leaveBtn.style.background = "rgba(255, 255, 255, 0.12)";
      leaveBtn.style.color = "#ffffff";
    });
    leaveBtn.addEventListener("mouseleave", () => {
      leaveBtn.style.background = "rgba(255, 255, 255, 0.06)";
      leaveBtn.style.color = "rgba(255, 255, 255, 0.7)";
    });
    leaveBtn.addEventListener("click", () => {
      ColyseusService.leaveRoom();
      this.destroy();
      window.location.reload();
    });
    header.append(titleBlock, leaveBtn);

    // Player list section
    const playersSection = document.createElement("div");
    playersSection.style.display = "flex";
    playersSection.style.flexDirection = "column";
    playersSection.style.gap = "8px";

    const playersLabel = document.createElement("div");
    Object.assign(playersLabel.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    });
    playersLabel.innerHTML = `<span>Active Astronauts</span><span id="player-count-badge">READY CHECK</span>`;

    this.playerListEl = document.createElement("div");
    Object.assign(this.playerListEl.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      minHeight: "48px",
      maxHeight: "140px",
      overflowY: "auto",
    });

    playersSection.append(playersLabel, this.playerListEl);

    // Role picker section
    const roleSection = document.createElement("div");
    roleSection.style.display = "flex";
    roleSection.style.flexDirection = "column";
    roleSection.style.gap = "8px";

    const rolePickerLabel = document.createElement("div");
    Object.assign(rolePickerLabel.style, {
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: "11px",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.5px",
      textTransform: "uppercase",
    });
    rolePickerLabel.textContent = "Assign Subsystem Station";

    const rolePickerMount = document.createElement("div");
    this.rolePicker = new RolePicker(rolePickerMount, this.sessionId);

    roleSection.append(rolePickerLabel, rolePickerMount);

    // Start button (host only)
    this.startError = document.createElement("span");
    Object.assign(this.startError.style, {
      color: "#fbbf24",
      fontSize: font.sizeXs,
      minHeight: "16px",
      textAlign: "center",
      fontFamily: "'JetBrains Mono', monospace",
    });

    this.startBtn = document.createElement("button");
    this.startBtn.id = "start-game-btn";
    this.startBtn.textContent = "Authorize Mission Launch";
    this.startBtn.disabled = true;
    Object.assign(this.startBtn.style, {
      background: "rgba(255, 255, 255, 0.08)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "10px",
      color: "rgba(255, 255, 255, 0.4)",
      cursor: "not-allowed",
      fontFamily: font.family,
      fontSize: "15px",
      fontWeight: "600",
      padding: "14px 20px",
      letterSpacing: "0.2px",
      transition: `all 0.2s ease`,
      display: this.isHost ? "block" : "none",
      width: "100%",
    });
    this.startBtn.addEventListener("click", () => {
      if (!this.startBtn.disabled) {
        ColyseusService.send("startGame");
      }
    });

    const hostNote = document.createElement("p");
    hostNote.textContent = this.isHost
      ? ""
      : "Waiting for Mission Commander to authorize launch…";
    Object.assign(hostNote.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0",
      textAlign: "center",
      display: this.isHost ? "none" : "block",
    });

    card.append(
      tag,
      header,
      playersSection,
      roleSection,
      this.startError,
      this.startBtn,
      hostNote,
    );
    overlay.appendChild(card);
    return overlay;
  }
}
