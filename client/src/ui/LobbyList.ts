import { Theme } from "../config/theme";
import { ColyseusService, LobbyMeta } from "../network/ColyseusService";

/**
 * LobbyList
 * ─────────
 * DOM overlay that shows available lobbies and lets the player:
 *  - Create a new lobby
 *  - Join an existing lobby
 *
 * Calls:
 *   onEnterLobby() after the player successfully creates or joins a room.
 *
 * Usage:
 *   const list = new LobbyList(username, onEnterLobby);
 *   list.mount();
 *   list.destroy();
 */
export class LobbyList {
  private container: HTMLDivElement;
  private username: string;
  private onEnterLobby: () => void;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(username: string, onEnterLobby: () => void) {
    this.username = username;
    this.onEnterLobby = onEnterLobby;
    this.container = this._buildDOM();
  }

  mount(): void {
    document.body.appendChild(this.container);
    this._refresh();
    // Poll for available lobbies every 3 seconds
    this.pollTimer = setInterval(() => this._refresh(), 3000);
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.container.remove();
  }

  private async _refresh(): Promise<void> {
    const list = this.container.querySelector<HTMLDivElement>("#lobby-list-items")!;
    list.innerHTML = "";

    const lobbies: LobbyMeta[] = await ColyseusService.getLobbies();

    if (lobbies.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No lobbies available. Create one!";
      empty.style.color = Theme.colors.textMuted;
      empty.style.textAlign = "center";
      empty.style.fontSize = Theme.font.sizeSm;
      list.appendChild(empty);
      return;
    }

    lobbies.forEach((lobby) => {
      const row = this._buildLobbyRow(lobby);
      list.appendChild(row);
    });
  }

  private _buildLobbyRow(lobby: LobbyMeta): HTMLDivElement {
    const { colors, font, spacing, radius, transition } = Theme;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: `${spacing.sm} ${spacing.md}`,
      marginBottom: spacing.sm,
    });

    const info = document.createElement("span");
    info.textContent = `Room ${lobby.roomId.slice(0, 8)} · ${lobby.clients}/${lobby.maxClients} players`;
    info.style.color = colors.textPrimary;
    info.style.fontSize = font.sizeSm;

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join";
    joinBtn.disabled = lobby.clients >= lobby.maxClients;
    Object.assign(joinBtn.style, {
      background: joinBtn.disabled ? colors.disabled : colors.accent,
      border: "none",
      borderRadius: radius.sm,
      color: "#fff",
      cursor: joinBtn.disabled ? "not-allowed" : "pointer",
      fontFamily: font.family,
      fontSize: font.sizeSm,
      padding: `${spacing.xs} ${spacing.md}`,
      transition: `background ${transition.fast}`,
    });

    if (!joinBtn.disabled) {
      joinBtn.addEventListener("mouseenter", () => { joinBtn.style.background = colors.accentHover; });
      joinBtn.addEventListener("mouseleave", () => { joinBtn.style.background = colors.accent; });
      joinBtn.addEventListener("click", async () => {
        joinBtn.disabled = true;
        joinBtn.textContent = "Joining…";
        try {
          await ColyseusService.joinLobby(lobby.roomId, this.username);
          this.destroy();
          this.onEnterLobby();
        } catch (e) {
          console.error("Failed to join lobby", e);
          joinBtn.disabled = false;
          joinBtn.textContent = "Join";
        }
      });
    }

    row.append(info, joinBtn);
    return row;
  }

  private _buildDOM(): HTMLDivElement {
    const { colors, font, spacing, radius } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "lobby-list-overlay";
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
      width: "460px",
      maxWidth: "90vw",
      display: "flex",
      flexDirection: "column",
      gap: spacing.md,
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    });

    const title = document.createElement("h2");
    title.textContent = "Lobbies";
    Object.assign(title.style, {
      color: colors.textPrimary,
      fontSize: font.sizeLg,
      margin: "0",
      letterSpacing: "2px",
    });

    const greeting = document.createElement("span");
    greeting.textContent = `Hello, ${this.username}`;
    greeting.style.color = colors.textMuted;
    greeting.style.fontSize = font.sizeSm;

    header.append(title, greeting);

    const listContainer = document.createElement("div");
    listContainer.id = "lobby-list-items";
    Object.assign(listContainer.style, {
      minHeight: "80px",
      maxHeight: "240px",
      overflowY: "auto",
    });

    const divider = document.createElement("hr");
    divider.style.borderColor = colors.border;
    divider.style.margin = "0";

    const createBtn = document.createElement("button");
    createBtn.id = "create-lobby-btn";
    createBtn.textContent = "+ Create New Lobby";
    Object.assign(createBtn.style, {
      background: colors.accent,
      border: "none",
      borderRadius: radius.md,
      color: "#fff",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: font.sizeMd,
      fontWeight: "bold",
      padding: `${spacing.sm} ${spacing.md}`,
      transition: `background 0.15s ease`,
      letterSpacing: "1px",
      alignSelf: "stretch",
    });
    createBtn.addEventListener("mouseenter", () => { createBtn.style.background = colors.accentHover; });
    createBtn.addEventListener("mouseleave", () => { createBtn.style.background = colors.accent; });
    createBtn.addEventListener("click", async () => {
      createBtn.disabled = true;
      createBtn.textContent = "Creating…";
      try {
        await ColyseusService.createLobby(this.username);
        this.destroy();
        this.onEnterLobby();
      } catch (e) {
        console.error("Failed to create lobby", e);
        createBtn.disabled = false;
        createBtn.textContent = "+ Create New Lobby";
      }
    });

    card.append(header, listContainer, divider, createBtn);
    overlay.appendChild(card);
    return overlay;
  }
}
