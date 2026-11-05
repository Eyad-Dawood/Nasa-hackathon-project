import Phaser from "phaser";
import { Assets } from "../config/assets";
import { getRoleHex } from "../config/theme";
import {
  MAP_GRID,
  MAP_COLS,
  MAP_ROWS,
  TILE,
  TILE_PX,
  PLAYER_SPAWN_TILE,
} from "../game/data/MapData";
import { NPC_LIST } from "../game/data/NpcData";
import { Objective } from "../game/data/ObjectiveData";
import { PlayerController } from "../game/systems/PlayerController";
import { NpcController } from "../game/systems/NpcController";
import { InteractionSystem } from "../game/systems/InteractionSystem";
import { RemotePlayerController } from "../game/systems/RemotePlayerController";
import { GameHUD } from "../game/ui/GameHUD";
import { ColyseusService } from "../network/ColyseusService";

/** How often (ms) the local player position is sent to the server. */
const MOVE_SEND_INTERVAL = 50; // 20 updates/sec

/**
 * GameScene
 * ─────────
 * Orchestrates the full game world: tilemap, physics, local player,
 * remote players (synced via GameRoom), NPCs, interaction, and HUD.
 *
 * DATA PASSED IN via scene.start("GameScene", { ... }):
 *   username    — local player's display name
 *   roles       — Array of role IDs
 *   gameRoomId  — ID of the GameRoom to join (from LobbyRoom's game-started event)
 */
export class GameScene extends Phaser.Scene {
  // ── Scene init data ──────────────────────────────────────────────────
  private username: string = "";
  private roles: string[] = ["no-role"];
  private gameRoomId: string = "";
  /**
   * The objective selected on ObjectiveScene.
   * null = offline/solo mode (no objective chosen).
   * Replace Objective type with a richer interface when real data is designed.
   */
  private objective: Objective | null = null;

  // ── Local player systems ──────────────────────────────────────────────
  private player!: PlayerController;
  private npcs: NpcController[] = [];
  private interaction!: InteractionSystem;
  private hud!: GameHUD;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;

  // ── Multiplayer ───────────────────────────────────────────────────────
  /** Remote players keyed by their Colyseus sessionId. */
  private remotePlayers: Map<string, RemotePlayerController> = new Map();

  // Position-send throttle
  private moveSendTimer: number = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: {
    username?: string;
    roles?: string[];
    gameRoomId?: string;
    objective?: Objective | null;
  }) {
    this.username =
      data?.username ?? localStorage.getItem("username") ?? "Player";
    this.roles = data?.roles ?? ["no-role"]; // Default to no-role if not provided
    this.gameRoomId = data?.gameRoomId ?? "";
    this.objective = data?.objective ?? null;
  }

  create() {
    const worldW = MAP_COLS * TILE_PX;
    const worldH = MAP_ROWS * TILE_PX;

    // ── 1. World bounds ───────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // ── 2. Tilemap ────────────────────────────────────────────────────
    this.wallsGroup = this._buildTilemap();

    // ── 3. Local player ───────────────────────────────────────────────
    const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
    const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;

    // استخدام الدور الأول لتحديد لون اللاعب
    const primaryRole = this.roles.length > 0 ? this.roles[0] : "no-role";

    this.player = new PlayerController(
      this,
      spawnX,
      spawnY,
      getRoleHex(primaryRole),
    );
    this.physics.add.collider(this.player.sprite, this.wallsGroup);

    // ── 4. NPCs ───────────────────────────────────────────────────────
    this.npcs = NPC_LIST.map((def) => new NpcController(this, def));

    // ── 5. Interaction system ─────────────────────────────────────────
    this.interaction = new InteractionSystem(this, this.player, this.npcs);

    // ── 6. HUD ────────────────────────────────────────────────────────
    this.hud = new GameHUD(this.username, this.roles);
    this.hud.mount();

    // ── 7. Camera ─────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // ── 8. Join GameRoom or reuse existing connection ─────────────────
    // ObjectiveScene already called joinGame() so the room connection is open.
    // We only call _connectToGameRoom() if not already connected (solo/offline).
    console.log(
      `[GameScene] Objective: ${this.objective ? `"${this.objective.label}"` : "(none)"}`,
    );
    this._connectToGameRoom(spawnX, spawnY);
  }

  update(_time: number, delta: number) {
    this.player.update();
    this.interaction.update();

    // Update all remote player lerp
    this.remotePlayers.forEach((rp) => rp.update());

    // Throttled position send
    this.moveSendTimer += delta;
    if (this.moveSendTimer >= MOVE_SEND_INTERVAL) {
      this.moveSendTimer = 0;
      if (ColyseusService.room) {
        ColyseusService.sendMove(this.player.worldX, this.player.worldY);
      }
    }
  }

  shutdown() {
    this.hud?.destroy();
    // Destroy all remote player sprites
    this.remotePlayers.forEach((rp) => rp.destroy());
    this.remotePlayers.clear();
    this.npcs = [];
    ColyseusService.leaveRoom();
  }

  // ── Multiplayer ───────────────────────────────────────────────────────

  private async _connectToGameRoom(
    spawnX: number,
    spawnY: number,
  ): Promise<void> {
    // ObjectiveScene already called joinGame() — reuse that connection.
    // Only call joinGame() if we have no room yet (offline/solo fallback).
    const alreadyConnected = ColyseusService.room !== null;

    if (!alreadyConnected) {
      if (!this.gameRoomId) {
        console.warn(
          "[GameScene] No gameRoomId — running in offline/solo mode.",
        );
        return;
      }

      try {
        await ColyseusService.joinGame(
          this.gameRoomId,
          this.username,
          this.roles, // 🔴 نرسل المصفوفة كاملة للسيرفر
          spawnX,
          spawnY,
        );
      } catch (e) {
        console.error("[GameScene] Failed to join GameRoom:", e);
        return;
      }
    }

    const room = ColyseusService.room;
    if (!room) return;
    const mySessionId = room.sessionId;

    // ── State change listener — syncs remote players ─────────────────
    room.onStateChange((state: any) => {
      const serverPlayers: Map<string, any> = state.players;

      // Add or update remote players
      serverPlayers.forEach((serverPlayer: any, sessionId: string) => {
        if (sessionId === mySessionId) return; // skip self

        const existing = this.remotePlayers.get(sessionId);
        if (existing) {
          // Update target position — sprite will lerp there in update()
          existing.updateTarget(serverPlayer.x, serverPlayer.y);
        } else {
          // 🔴 استخراج مصفوفة الأدوار الخاصة باللاعب الآخر
          let rolesArray: string[] = ["no-role"];
          if (serverPlayer.roles) {
            rolesArray =
              typeof serverPlayer.roles.toArray === "function"
                ? serverPlayer.roles.toArray()
                : Array.from(serverPlayer.roles as Iterable<string>);
          }

          // New remote player appeared — create a controller for them
          const rp = new RemotePlayerController(
            this,
            sessionId,
            serverPlayer.username,
            rolesArray, // 🔴 نمرر المصفوفة كاملة לـ RemotePlayerController
            serverPlayer.x,
            serverPlayer.y,
          );
          this.remotePlayers.set(sessionId, rp);
        }
      });

      // Remove players who left
      this.remotePlayers.forEach((_rp, sessionId) => {
        if (!serverPlayers.has(sessionId)) {
          this.remotePlayers.get(sessionId)?.destroy();
          this.remotePlayers.delete(sessionId);
        }
      });
    });

    console.log(
      `[GameScene] Connected to GameRoom ${this.gameRoomId} as ${mySessionId}`,
    );
  }

  // ── Tilemap ───────────────────────────────────────────────────────────

  /**
   * Reads MAP_GRID and places tile images.
   * Wall/water tiles go into a StaticGroup for physics colliders.
   * To add a new tile type: add a TILE constant, generate its texture in BootScene,
   * and add a case in the switch below.
   */
  private _buildTilemap(): Phaser.Physics.Arcade.StaticGroup {
    const wallsGroup = this.physics.add.staticGroup();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = MAP_GRID[row]?.[col] ?? TILE.GRASS;
        const x = col * TILE_PX + TILE_PX / 2;
        const y = row * TILE_PX + TILE_PX / 2;
        const scale = TILE_PX / 16;

        let textureKey: string;
        let isCollidable = false;

        switch (tileType) {
          case TILE.WALL:
            textureKey = Assets.tileWall.key;
            isCollidable = true;
            break;
          case TILE.WATER:
            textureKey = Assets.tileWater.key;
            isCollidable = true;
            break;
          case TILE.GRASS:
          default:
            textureKey = Assets.tileGrass.key;
            break;
        }

        if (isCollidable) {
          const tile = wallsGroup.create(
            x,
            y,
            textureKey,
          ) as Phaser.Physics.Arcade.Image;
          tile.setScale(scale);
          tile.refreshBody();
          tile.setDepth(1);
        } else {
          this.add.image(x, y, textureKey).setScale(scale).setDepth(0);
        }
      }
    }

    return wallsGroup;
  }
}
