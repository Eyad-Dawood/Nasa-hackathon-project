import Phaser from "phaser";
import { ColyseusService } from "../network/ColyseusService";
import { LobbyList } from "../ui/LobbyList";
import { LobbyRoomPanel } from "../ui/LobbyRoomPanel";

/**
 * LobbyScene
 * ──────────
 * Phaser scene that acts as the container for all pre-game UI.
 *
 * Flow:
 *   1. Show LobbyList (create/join a room).
 *   2. After joining, show LobbyRoomPanel (players, roles, start button).
 *   3. On "game-started" → transition to GameScene.
 *
 * All UI is handled by DOM overlay components (LobbyList / LobbyRoomPanel).
 * Phaser canvas shows a dark background here.
 */
export class LobbyScene extends Phaser.Scene {
  private username: string = "";
  private lobbyList: LobbyList | null = null;
  private lobbyPanel: LobbyRoomPanel | null = null;
  private stateUnsub: (() => void) | null = null;
  private gameRoomId: string = "";

  constructor() {
    super({ key: "LobbyScene" });
  }

  init(data: { username?: string }) {
    this.username =
      data?.username ?? localStorage.getItem("username") ?? "Player";
  }

  create() {
    this.cameras.main.setBackgroundColor("#0d0d1a");

    // Show the lobby browser
    this.lobbyList = new LobbyList(this.username, () => this._onEnterRoom());
    this.lobbyList.mount();
  }

  shutdown() {
    this.lobbyList?.destroy();
    this.lobbyPanel?.destroy();
    this.stateUnsub?.();
  }

  // ─── Private ─────────────────────────────────────────────────────────

  private _onEnterRoom(): void {
    const room = ColyseusService.room;
    if (!room) return;

    const isHost = room.sessionId === room.state?.hostId;

    this.lobbyPanel = new LobbyRoomPanel(room.sessionId, isHost, (gameRoomId: string) => {
      this._onGameStarted(gameRoomId);
    });
    this.lobbyPanel.mount();

    // Initial render
    this._syncPanel();

    // Re-render on every state change
    room.onStateChange(() => {
      this._syncPanel();
    });
  }

  private _syncPanel(): void {
    const room = ColyseusService.room;
    if (!room || !this.lobbyPanel) return;

    const state = room.state;

    if (!state || !state.players) return;

    // Convert Colyseus MapSchema to a plain Map for the panel
    const players = new Map<
      string,
      { id: string; username: string; roles: string[]; ready: boolean }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.players.forEach((player: any, sessionId: string) => {
      // ArraySchema may not support spread directly — use Array.from or toArray
      let roles: string[] = [];
      if (player.roles) {
        if (typeof player.roles.toArray === "function") {
          roles = player.roles.toArray();
        } else {
          roles = Array.from(player.roles as Iterable<string>);
        }
      }
      players.set(sessionId, {
        id: player.id,
        username: player.username,
        roles,
        ready: player.ready,
      });
    });

    this.lobbyPanel.refresh(players, state.hostId);

    // Update isHost dynamically in case host changed
    const isHost = room.sessionId === state.hostId;
    const startBtn = document.getElementById(
      "start-game-btn",
    ) as HTMLButtonElement | null;
    if (startBtn) {
      startBtn.style.display = isHost ? "block" : "none";
    }
  }
  private _onGameStarted(gameRoomId: string): void {
    const room = ColyseusService.room;
    if (room && room.state && room.state.players) {
      console.log("🎮 Game Started! Players and their roles:");

      room.state.players.forEach((player: any, sessionId: string) => {
        let roles: string[] = [];
        if (player.roles) {
          if (typeof player.roles.toArray === "function") {
            roles = player.roles.toArray();
          } else {
            roles = Array.from(player.roles as Iterable<string>);
          }
        }

        console.log(
          `- Player: ${player.username} | Roles: [${roles.join(", ")}]`,
        );
      });
    }

    // Extract local player's first assigned role to pass to GameScene
    let localRoleId = "role1";
    if (room && room.state && room.state.players) {
      const localPlayer = room.state.players.get(room.sessionId);
      if (localPlayer && localPlayer.roles) {
        const roles: string[] = typeof localPlayer.roles.toArray === "function"
          ? localPlayer.roles.toArray()
          : Array.from(localPlayer.roles as Iterable<string>);
        if (roles.length > 0) localRoleId = roles[0];
      }
    }

    this.lobbyPanel?.destroy();
    this.stateUnsub?.();
    // Note: do NOT call ColyseusService.leaveRoom() here — GameScene will
    // call joinGame() which internally leaves the lobby room first.
    this.scene.start("GameScene", {
      username: this.username,
      roleId: localRoleId,
      gameRoomId,
    });
  }
}
