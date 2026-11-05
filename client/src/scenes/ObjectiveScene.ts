import Phaser from "phaser";
import { ColyseusService } from "../network/ColyseusService";
import { ObjectivePicker } from "../ui/ObjectivePicker";
import { getObjectiveById, Objective } from "../game/data/ObjectiveData";
import { PLAYER_SPAWN_TILE, TILE_PX } from "../game/data/MapData";

/**
 * ObjectiveScene
 * ──────────────
 * Sits between LobbyScene and GameScene.
 *
 * FLOW:
 *   1. Scene starts with { username, roleId, gameRoomId, hostId } from LobbyScene.
 *   2. Joins the GameRoom via ColyseusService.joinGame().
 *   3. Mounts ObjectivePicker DOM overlay:
 *        HOST     → sees objective cards; clicking "Select" sends "selectObjective".
 *        NON-HOST → sees "Waiting for host…".
 *   4. Listens to room.onStateChange:
 *        When state.selectedObjectiveId becomes non-empty → look up full Objective,
 *        destroy picker, transition to GameScene with the objective attached.
 *
 * DATA PASSED TO GameScene:
 *   { username, roleId, gameRoomId, objective: Objective }
 *
 * NOTE: GameScene must NOT call joinGame() again — the connection is already open here.
 */
export class ObjectiveScene extends Phaser.Scene {
  private username: string = "";
  private roles: string[] = ["no-role"];
  private gameRoomId: string = "";
  private hostId: string = "";
  private isHost: boolean = false;

  private picker: ObjectivePicker | null = null;

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
    this.gameRoomId = data?.gameRoomId ?? ""; // ← was broken: accidentally on same line as roles
    this.hostId = data?.hostId ?? "";
    this.isHost = data?.isHost ?? false;

    console.log(
      `[ObjectiveScene] init — gameRoomId="${this.gameRoomId}" isHost=${this.isHost}`,
    );
  }

  create() {
    this.cameras.main.setBackgroundColor("#0d0d1a");
    this._connectAndWait();
  }

  shutdown() {
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
      // Player's spawn position in world pixels (same as GameScene uses)
      const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
      const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;

      console.log("=== 🚩 TRACKING: 3. Calling ColyseusService.joinGame ===");
      console.log("Passing this.isHost:", this.isHost);
      console.log("=======================================================");

      // Join the GameRoom. This connection will be reused by GameScene.
      await ColyseusService.joinGame(
        this.gameRoomId,
        this.username,
        this.roles,
        spawnX,
        spawnY,
        this.isHost, // 🔴 Pass isHost to the server
      );

      const room = ColyseusService.room!;

      // Mount the picker overlay
      this.picker = new ObjectivePicker(this.isHost);
      this.picker.mount();

      // 🔴 متغير لضمان تنفيذ الانتقال لـ GameScene مرة واحدة فقط
      let hasConfirmedObjective = false;

      // Watch for the host's selection via schema sync
      room.onStateChange((state: any) => {
        // إذا كنا قد انتقلنا بالفعل، تجاهل أي تغييرات جديدة في الـ state
        if (hasConfirmedObjective) return;

        const objectiveId: string = state.selectedObjectiveId ?? "";
        if (objectiveId) {
          const objective = getObjectiveById(objectiveId);

          // 🔴 نضع العلامة كـ true لمنع تكرار الكود
          hasConfirmedObjective = true;

          this._onObjectiveConfirmed(objective);
        }
      });

      // Also handle objectiveError for host feedback
      ColyseusService.on("objectiveError", (data: unknown) => {
        const msg = (data as { message: string }).message;
        console.warn("[ObjectiveScene] objectiveError:", msg);
        // Re-enable buttons by destroying and re-mounting picker
        this.picker?.destroy();
        this.picker = new ObjectivePicker(this.isHost);
        this.picker.mount();
      });
    } catch (e) {
      console.error("[ObjectiveScene] Failed to join GameRoom:", e);
      // Fallback: go to GameScene without an objective
      this._goToGame(undefined);
    }
  }
  private _onObjectiveConfirmed(objective: Objective | undefined): void {
    console.log(
      "[ObjectiveScene] Objective confirmed:",
      objective?.id ?? "(unknown)",
    );
    this.picker?.destroy();
    this.picker = null;
    this._goToGame(objective);
  }

  private _goToGame(objective: Objective | undefined): void {
    this.scene.start("GameScene", {
      username: this.username,
      roles: this.roles,
      gameRoomId: this.gameRoomId,
      objective: objective ?? null, // null if none chosen (solo/offline)
    });
  }
}
