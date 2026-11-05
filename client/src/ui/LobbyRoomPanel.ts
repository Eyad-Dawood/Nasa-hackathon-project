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

    // Enable start button only if all 4 roles are assigned
    const allAssigned = ALL_ROLE_IDS.every((rid) => assignments[rid] !== null);
    this.startBtn.disabled = !allAssigned;
    this.startBtn.style.background = allAssigned
      ? Theme.colors.success
      : Theme.colors.disabled;
    this.startBtn.style.cursor = allAssigned ? "pointer" : "not-allowed";

    if (allAssigned) {
      this.startBtn.textContent = "Start Game";
    } else {
      const remaining = ALL_ROLE_IDS.filter(
        (rid) => assignments[rid] === null,
      ).length;
      this.startBtn.textContent = `Start Game (${remaining} roles unassigned)`;
    }
  }

  private _buildPlayerRow(
    player: PlayerInfo,
    isHostPlayer: boolean,
  ): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: spacing.sm,
      padding: `${spacing.xs} ${spacing.sm}`,
      background:
        player.id === this.sessionId ? `${colors.accent}18` : "transparent",
      borderRadius: radius.sm,
    });

    const name = document.createElement("span");
    name.textContent = player.username;
    name.style.color = colors.textPrimary;
    name.style.fontSize = font.sizeMd;
    name.style.flex = "1";

    const badges = document.createElement("div");
    badges.style.display = "flex";
    badges.style.gap = spacing.xs;

    if (isHostPlayer) {
      const hostBadge = document.createElement("span");
      hostBadge.textContent = "HOST";
      this._styleBadge(hostBadge, colors.hostBadge);
      badges.appendChild(hostBadge);
    }

    if (player.roles.length > 0) {
      const rolesBadge = document.createElement("span");
      rolesBadge.textContent = player.roles
        .map((r) => Theme.roles.find((d) => d.id === r)?.label ?? r)
        .join(", ");
      this._styleBadge(rolesBadge, colors.readyBadge);
      badges.appendChild(rolesBadge);
    }

    row.append(name, badges);
    return row;
  }

  private _styleBadge(el: HTMLSpanElement, color: string): void {
    Object.assign(el.style, {
      background: `${color}33`,
      border: `1px solid ${color}`,
      borderRadius: Theme.radius.full,
      color: color,
      fontSize: Theme.font.sizeXs,
      padding: `1px ${Theme.spacing.sm}`,
      whiteSpace: "nowrap",
    });
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
      justifyContent: "center",
      background: "rgba(0,0,0,0.85)",
      zIndex: "1000",
      fontFamily: font.family,
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: "520px",
      maxWidth: "92vw",
      display: "flex",
      flexDirection: "column",
      gap: spacing.md,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    });

    // Header
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    });

    const title = document.createElement("h2");
    title.textContent = "Lobby";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: font.sizeLg,
      margin: "0",
      letterSpacing: "2px",
    });

    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "Leave";
    Object.assign(leaveBtn.style, {
      background: "transparent",
      border: `1px solid ${colors.border}`,
      borderRadius: radius.sm,
      color: colors.textMuted,
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: font.sizeSm,
      padding: `${spacing.xs} ${spacing.md}`,
    });
    leaveBtn.addEventListener("click", () => {
      ColyseusService.leaveRoom();
      this.destroy();
      // Reload to go back to lobby list
      window.location.reload();
    });
    header.append(title, leaveBtn);

    // Player list section
    const playersLabel = document.createElement("h3");
    playersLabel.textContent = "Players";
    Object.assign(playersLabel.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0",
      letterSpacing: "1px",
      textTransform: "uppercase",
    });

    this.playerListEl = document.createElement("div");
    Object.assign(this.playerListEl.style, {
      display: "flex",
      flexDirection: "column",
      gap: spacing.xs,
      minHeight: "60px",
    });

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border;
    divider.style.margin = "0";

    // Role picker
    const rolePickerMount = document.createElement("div");
    this.rolePicker = new RolePicker(rolePickerMount, this.sessionId);

    const divider2 = document.createElement("hr");
    divider2.style.borderColor = colors.border;
    divider2.style.margin = "0";

    // Start button (host only)
    this.startError = document.createElement("span");
    Object.assign(this.startError.style, {
      color: colors.accent,
      fontSize: font.sizeXs,
      minHeight: "16px",
      textAlign: "center",
    });

    this.startBtn = document.createElement("button");
    this.startBtn.id = "start-game-btn";
    this.startBtn.textContent = "Start Game";
    this.startBtn.disabled = true;
    Object.assign(this.startBtn.style, {
      background: colors.disabled,
      border: "none",
      borderRadius: radius.md,
      color: "#fff",
      cursor: "not-allowed",
      fontFamily: font.family,
      fontSize: font.sizeLg,
      fontWeight: "bold",
      padding: `${spacing.sm} ${spacing.md}`,
      letterSpacing: "1px",
      transition: `background 0.2s ease`,
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
      : "Waiting for host to start the game…";
    Object.assign(hostNote.style, {
      color: colors.textMuted,
      fontSize: font.sizeSm,
      margin: "0",
      textAlign: "center",
      display: this.isHost ? "none" : "block",
    });

    card.append(
      header,
      playersLabel,
      this.playerListEl,
      divider,
      rolePickerMount,
      divider2,
      this.startError,
      this.startBtn,
      hostNote,
    );
    overlay.appendChild(card);
    return overlay;
  }
}
