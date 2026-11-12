import Phaser from "phaser";
import { ColyseusService } from "../network/ColyseusService";
import { ObjectivePicker } from "../ui/ObjectivePicker";
import { getObjectiveById, Objective } from "../game/data/ObjectiveData";
import { PLAYER_SPAWN_TILE, TILE_PX } from "../game/data/MapData";

/**
 * ObjectiveScene
 * ──────────────
 * Sits between LobbyScene and GameScene.
 * Joins the GameRoom and waits for the host to confirm a canonical mission (M01–M06).
 */
export class ObjectiveScene extends Phaser.Scene {
  private username: string = "";
  private roles: string[] = ["no-role"];
  private gameRoomId: string = "";
  private hostId: string = "";
  private isHost: boolean = false;

  private picker: ObjectivePicker | null = null;
  private isShutDown: boolean = false;
  private unsubObjectiveError: (() => void) | null = null;

  constructor() {
    super({ key: "ObjectiveScene" });
  }

  init(data: {
    username?: string;
    roles?: string[];
    gameRoomId?: string;
    hostId?: string;
    isHost?: boolean;
  }) {
    this.username =
      data?.username ?? localStorage.getItem("username") ?? "Player";
    this.roles = data?.roles ?? ["powerAndThermal"];
    this.gameRoomId = data?.gameRoomId ?? "";
    this.hostId = data?.hostId ?? "";
    this.isHost = data?.isHost ?? false;
    this.isShutDown = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0d0d1a");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this._connectAndWait();
  }

  shutdown() {
    this.isShutDown = true;
    this.unsubObjectiveError?.();
    this.unsubObjectiveError = null;
    this.picker?.destroy();
    this.picker = null;
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async _connectAndWait(): Promise<void> {
    if (!this.gameRoomId) {
      console.warn("[ObjectiveScene] No gameRoomId — skipping to GameScene.");
      this._goToGame(undefined);
      return;
    }

    try {
      const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
      const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;

      await ColyseusService.joinGame(
        this.gameRoomId,
        this.username,
        this.roles,
        spawnX,
        spawnY,
        this.isHost,
      );

      if (this.isShutDown) return;

      const room = ColyseusService.room;
      if (!room) {
        this._goToGame(undefined);
        return;
      }

      this.isHost = Boolean(this.isHost || (room.state?.hostId && room.sessionId === room.state.hostId));
      const unlockedLevel = Number(room.state?.highestUnlockedLevel ?? 6);

      this.picker = new ObjectivePicker(this.isHost, unlockedLevel);
      this.picker.mount();

      let hasConfirmedObjective = false;

      // Check initial state in case mission was already confirmed before join resolved
      const initialId: string = room.state?.selectedObjectiveId ?? "";
      if (initialId) {
        const initialObj = getObjectiveById(initialId);
        if (initialObj) {
          hasConfirmedObjective = true;
          this._onObjectiveConfirmed(initialObj);
          return;
        }
      }

      room.onStateChange((state: any) => {
        if (this.isShutDown || hasConfirmedObjective) return;

        // Reflect host promotion dynamically if original host disconnected
        if (state.hostId) {
          const currentIsHost = room.sessionId === state.hostId;
          if (currentIsHost !== this.isHost) {
            this.isHost = currentIsHost;
            this.picker?.setHost(currentIsHost);
          }
        }

        if (typeof state.highestUnlockedLevel === "number") {
          this.picker?.setUnlockedLevel(state.highestUnlockedLevel);
        }

        const objectiveId: string = state.selectedObjectiveId ?? "";
        if (objectiveId) {
          const objective = getObjectiveById(objectiveId);
          if (objective) {
            hasConfirmedObjective = true;
            this._onObjectiveConfirmed(objective);
          }
        }
      });

      this.unsubObjectiveError = ColyseusService.on("objectiveError", (data: unknown) => {
        const msg = (data as { message?: string })?.message ?? "Unable to select mission.";
        console.warn("[ObjectiveScene] objectiveError:", msg);
        this.picker?.showError(msg);
      });
    } catch (e) {
      console.error("[ObjectiveScene] Failed to join GameRoom:", e);
      if (!this.isShutDown) {
        this._goToGame(undefined);
      }
    }
  }

  private _onObjectiveConfirmed(objective: Objective | undefined): void {
    if (this.isShutDown) return;
    this.picker?.destroy();
    this.picker = null;
    this._goToGame(objective);
  }

  private _goToGame(objective: Objective | undefined): void {
    this.scene.start("GameScene", {
      username: this.username,
      roles: this.roles,
      gameRoomId: this.gameRoomId,
      objective: objective ?? null,
      isHost: this.isHost,
    });
  }
}
