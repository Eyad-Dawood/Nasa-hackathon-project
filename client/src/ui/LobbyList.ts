import { Theme } from "../config/theme";
import { ColyseusService, LobbyMeta } from "../network/ColyseusService";
import { OnboardingGuideUI } from "./OnboardingGuideUI";

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
      const empty = document.createElement("div");
      Object.assign(empty.style, {
        padding: "24px 0",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      });
      empty.innerHTML = `
        <div style="color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500;">No active flight bays detected.</div>
        <div style="color: rgba(255, 255, 255, 0.45); font-size: 13px; line-height: 1.5;">Establish an orbital staging bay below to assemble your co-op crew.</div>
      `;
      list.appendChild(empty);
      return;
    }

    lobbies.forEach((lobby) => {
      const row = this._buildLobbyRow(lobby);
      list.appendChild(row);
    });
  }

  private _buildLobbyRow(lobby: LobbyMeta): HTMLDivElement {
    const { font, transition } = Theme;

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "rgba(255, 255, 255, 0.04)",
      boxShadow: "inset 0 1px 0.5px rgba(255, 255, 255, 0.16), inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      backdropFilter: "blur(12px) saturate(1.4)",
      WebkitBackdropFilter: "blur(12px) saturate(1.4)",
      border: "none",
      borderRadius: "12px",
      padding: "12px 16px",
      marginBottom: "8px",
      transition: `all ${transition.fast}`,
    });

    const info = document.createElement("div");
    info.style.display = "flex";
    info.style.flexDirection = "column";
    info.style.gap = "3px";

    const title = document.createElement("span");
    title.textContent = `Mission Bay ${lobby.roomId.slice(0, 6).toUpperCase()}`;
    title.style.color = "#ffffff";
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";
    title.style.fontFamily = "'JetBrains Mono', monospace";

    const meta = document.createElement("span");
    meta.textContent = `${lobby.clients}/${lobby.maxClients} Crew Members Staged`;
    meta.style.color = "rgba(255, 255, 255, 0.45)";
    meta.style.fontSize = "12px";

    info.append(title, meta);

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Dock & Join";
    joinBtn.disabled = lobby.clients >= lobby.maxClients;
    Object.assign(joinBtn.style, {
      background: joinBtn.disabled
        ? "rgba(255,255,255,0.04)"
        : "rgba(255, 255, 255, 0.1)",
      boxShadow: joinBtn.disabled
        ? "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)"
        : "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)",
      border: "none",
      borderRadius: "8px",
      color: joinBtn.disabled ? "rgba(255, 255, 255, 0.3)" : "#ffffff",
      cursor: joinBtn.disabled ? "not-allowed" : "pointer",
      fontFamily: font.family,
      fontSize: "13px",
      fontWeight: "500",
      padding: "8px 16px",
      transition: `all ${transition.fast}`,
    });

    if (!joinBtn.disabled) {
      joinBtn.addEventListener("mouseenter", () => {
        joinBtn.style.background = "rgba(255, 255, 255, 0.18)";
        joinBtn.style.boxShadow = "inset 0 1px 1px rgba(255, 255, 255, 0.35)";
      });
      joinBtn.addEventListener("mouseleave", () => {
        joinBtn.style.background = "rgba(255, 255, 255, 0.1)";
        joinBtn.style.boxShadow = "inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)";
      });
      joinBtn.addEventListener("click", async () => {
        joinBtn.disabled = true;
        joinBtn.textContent = "Connecting…";
        try {
          await ColyseusService.joinLobby(lobby.roomId, this.username);
          this.destroy();
          this.onEnterLobby();
        } catch (e) {
          console.error("Failed to join lobby", e);
          joinBtn.disabled = false;
          joinBtn.textContent = "Dock & Join";
        }
      });
    }

    row.append(info, joinBtn);
    return row;
  }

  private _buildDOM(): HTMLDivElement {
    const { font } = Theme;

    const overlay = document.createElement("div");
    overlay.id = "lobby-list-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end", // Placed in the dark Earth space on the right
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
      width: "460px",
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      pointerEvents: "auto",
    });

    // Top Mission Telemetry Eyebrow - Monochrome Glisse
    const tag = document.createElement("div");
    Object.assign(tag.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "11px",
      color: "rgba(255, 255, 255, 0.45)",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
    });
    tag.innerHTML = `<span>NASA DEEP SPACE CO-OP &middot; ORBITAL STAGING</span>`;

    // Title & Subtitle block
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    });

    const title = document.createElement("h1");
    title.textContent = "Flight Lobbies";
    Object.assign(title.style, {
      background: "linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.65) 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      fontSize: "38px",
      fontWeight: "700",
      letterSpacing: "-0.6px",
      margin: "0",
      lineHeight: "1.1",
    });

    const greeting = document.createElement("span");
    greeting.textContent = `Astronaut ${this.username} · Ready for deployment`;
    greeting.style.color = "rgba(255, 255, 255, 0.45)";
    greeting.style.fontSize = "14px";

    header.append(title, greeting);

    // NASA Flight Academy & Video Briefings button
    const academyBtn = document.createElement("button");
    academyBtn.id = "lobby-academy-btn";
    academyBtn.innerHTML = `
      <span style="display:flex; align-items:center; justify-content:space-between; width:100%;">
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <span style="font-size:13px; color:#29ADFF; font-weight:700;">▶</span>
          <span>NASA Academy & Video Briefings</span>
        </span>
        <span style="background:rgba(41, 173, 255, 0.2); color:#29ADFF; padding:2px 7px; border-radius:4px; font-size:10px; font-family:'JetBrains Mono', monospace; font-weight:700;">10 VIDEOS</span>
      </span>
    `;
    Object.assign(academyBtn.style, {
      background: "rgba(41, 173, 255, 0.1)",
      border: "1px solid rgba(41, 173, 255, 0.3)",
      borderRadius: "12px",
      color: "#ffffff",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: "12.5px",
      fontWeight: "600",
      padding: "11px 16px",
      display: "flex",
      alignItems: "center",
      transition: "all 0.15s ease",
      boxShadow: "0 4px 16px rgba(41, 173, 255, 0.12)",
    });
    academyBtn.addEventListener("mouseenter", () => {
      academyBtn.style.background = "rgba(41, 173, 255, 0.2)";
      academyBtn.style.borderColor = "rgba(41, 173, 255, 0.55)";
    });
    academyBtn.addEventListener("mouseleave", () => {
      academyBtn.style.background = "rgba(41, 173, 255, 0.1)";
      academyBtn.style.borderColor = "rgba(41, 173, 255, 0.3)";
    });
    academyBtn.addEventListener("click", () => {
      OnboardingGuideUI.get().open("briefing");
    });

    const listContainer = document.createElement("div");
    listContainer.id = "lobby-list-items";
    Object.assign(listContainer.style, {
      minHeight: "80px",
      maxHeight: "260px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });

    const createBtn = document.createElement("button");
    createBtn.id = "create-lobby-btn";
    createBtn.textContent = "+ Establish New Mission Bay";
    Object.assign(createBtn.style, {
      background: "#ffffff",
      border: "none",
      borderRadius: "12px",
      color: "#04060a",
      cursor: "pointer",
      fontFamily: font.family,
      fontSize: "15px",
      fontWeight: "600",
      padding: "14px 20px",
      transition: `all 0.15s ease`,
      letterSpacing: "0.2px",
      alignSelf: "stretch",
      boxShadow: "0 4px 24px rgba(255, 255, 255, 0.25), inset 0 1px 1px #ffffff",
    });
    createBtn.addEventListener("mouseenter", () => {
      createBtn.style.boxShadow = "0 6px 32px rgba(255, 255, 255, 0.45)";
    });
    createBtn.addEventListener("mouseleave", () => {
      createBtn.style.boxShadow = "0 4px 24px rgba(255, 255, 255, 0.25)";
    });
    createBtn.addEventListener("click", async () => {
      createBtn.disabled = true;
      createBtn.textContent = "Deploying Bay…";
      try {
        await ColyseusService.createLobby(this.username);
        this.destroy();
        this.onEnterLobby();
      } catch (e) {
        console.error("Failed to create lobby", e);
        createBtn.disabled = false;
        createBtn.textContent = "+ Establish New Mission Bay";
      }
    });

    card.append(tag, header, academyBtn, listContainer, createBtn);
    overlay.appendChild(card);
    return overlay;
  }
}
