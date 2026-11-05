import Phaser from "phaser";
import { Assets } from "../config/assets";
import { getRoleHex } from "../config/theme";
import {
  MAP_GRID, MAP_COLS, MAP_ROWS,
  TILE, TILE_PX, PLAYER_SPAWN_TILE,
} from "../game/data/MapData";
import { NPC_LIST } from "../game/data/NpcData";
import { Objective } from "../game/data/ObjectiveData";
import { STATIONS } from "../game/data/StationData";
import { PlayerController } from "../game/systems/PlayerController";
import { NpcController } from "../game/systems/NpcController";
import { InteractionSystem } from "../game/systems/InteractionSystem";
import { RemotePlayerController } from "../game/systems/RemotePlayerController";
import { CarrySystem } from "../game/systems/CarrySystem";
import { GameHUD } from "../game/ui/GameHUD";
import { StationEntity } from "../game/entities/StationEntity";
import { ShipEntity } from "../game/entities/ShipEntity";
import { IInteractable } from "../game/interfaces/IInteractable";
import { ColyseusService } from "../network/ColyseusService";

/** How often (ms) the local player position is sent to the server. */
const MOVE_SEND_INTERVAL = 50; // 20 updates/sec

/**
 * GameScene  —  Top-level scene orchestrator.
 * ───────────────────────────────────────────
 * Wires all systems together. Contains NO game logic itself —
 * all mechanics live in dedicated system/entity files.
 *
 * DATA PASSED IN via scene.start("GameScene", { ... }):
 *   username    — display name
 *   roles       — string[] of assigned role ids
 *   gameRoomId  — Colyseus GameRoom id
 *   objective   — Objective | null (selected on ObjectiveScene)
 */
export class GameScene extends Phaser.Scene {
  // ── Init data ─────────────────────────────────────────────────────────
  private username:   string    = "";
  private roles:      string[]  = ["no-role"];
  private gameRoomId: string    = "";
  private objective:  Objective | null = null;

  // ── World ─────────────────────────────────────────────────────────────
  private wallsGroup!:    Phaser.Physics.Arcade.StaticGroup;

  // ── Local player systems ──────────────────────────────────────────────
  private player!:        PlayerController;
  private carry!:         CarrySystem;
  private npcs:           NpcController[]    = [];
  private stations:       StationEntity[]    = [];
  private ship!:          ShipEntity;
  private interaction!:   InteractionSystem;
  private hud!:           GameHUD;

  // ── Multiplayer ───────────────────────────────────────────────────────
  private remotePlayers:  Map<string, RemotePlayerController> = new Map();
  private moveSendTimer:  number = 0;

  constructor() { super({ key: "GameScene" }); }

  init(data: {
    username?:   string;
    roles?:      string[];
    gameRoomId?: string;
    objective?:  Objective | null;
  }) {
    this.username   = data?.username   ?? localStorage.getItem("username") ?? "Player";
    this.roles      = data?.roles      ?? ["no-role"];
    this.gameRoomId = data?.gameRoomId ?? "";
    this.objective  = data?.objective  ?? null;
  }

  create() {
    const worldW = MAP_COLS * TILE_PX;
    const worldH = MAP_ROWS * TILE_PX;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // ── 1. Tilemap ────────────────────────────────────────────────────────
    this.wallsGroup = this._buildTilemap();

    // ── 2. Local player ───────────────────────────────────────────────────
    const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
    const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;
    const primaryRole = this.roles[0] ?? "no-role";

    this.player = new PlayerController(this, spawnX, spawnY, getRoleHex(primaryRole));
    this.physics.add.collider(this.player.sprite, this.wallsGroup);

    // ── 3. Carry system ───────────────────────────────────────────────────
    this.carry = new CarrySystem(this);

    // ── 4. NPCs ───────────────────────────────────────────────────────────
    this.npcs = NPC_LIST.map((def) => new NpcController(this, def));

    // ── 5. Stations (corners) ─────────────────────────────────────────────
    this.stations = STATIONS.map(
      (def) => new StationEntity(this, def, this.roles, this.carry),
    );

    // ── 6. Spaceship (center) ─────────────────────────────────────────────
    this.ship = new ShipEntity(this, this.carry);

    // ── 7. InteractionSystem — receives ALL interactables ─────────────────
    const interactables: IInteractable[] = [
      ...this.npcs,
      ...this.stations,
      this.ship,
    ];
    this.interaction = new InteractionSystem(this, this.player, interactables);

    // ── 8. HUD ────────────────────────────────────────────────────────────
    this.hud = new GameHUD(this.username, this.roles);
    this.hud.mount();

    // ── 9. Camera ─────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // ── 10. Connect to GameRoom ────────────────────────────────────────────
    console.log(
      `[GameScene] Objective: ${this.objective ? `"${this.objective.label}"` : "(none)"}`,
    );
    this._connectToGameRoom(spawnX, spawnY);
  }

  update(_time: number, delta: number) {
    this.player.update();
    this.carry.update(this.player.worldX, this.player.worldY);
    this.interaction.update();

    // NpcControllers own their own dialogue rendering — call update()
    this.npcs.forEach((npc) => npc.update());

    // Remote player lerp
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
    this.remotePlayers.forEach((rp) => rp.destroy());
    this.remotePlayers.clear();
    this.npcs = [];
    this.stations = [];
    ColyseusService.leaveRoom();
  }

  // ── Multiplayer ────────────────────────────────────────────────────────

  private async _connectToGameRoom(spawnX: number, spawnY: number): Promise<void> {
    // ObjectiveScene already called joinGame() — reuse that connection.
    // Only call joinGame() in solo/offline mode (no room yet).
    const alreadyConnected = ColyseusService.room !== null;

    if (!alreadyConnected) {
      if (!this.gameRoomId) {
        console.warn("[GameScene] No gameRoomId — offline/solo mode.");
        return;
      }
      try {
        await ColyseusService.joinGame(
          this.gameRoomId,
          this.username,
          this.roles,
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

    room.onStateChange((state: any) => {
      // ── Remote players ──────────────────────────────────────────────
      const serverPlayers: Map<string, any> = state.players;

      serverPlayers.forEach((sp: any, sessionId: string) => {
        if (sessionId === mySessionId) return;

        const existing = this.remotePlayers.get(sessionId);
        if (existing) {
          existing.updateTarget(sp.x, sp.y);
        } else {
          let rolesArr: string[] = ["no-role"];
          if (sp.roles) {
            rolesArr = typeof sp.roles.toArray === "function"
              ? sp.roles.toArray()
              : Array.from(sp.roles as Iterable<string>);
          }
          const rp = new RemotePlayerController(
            this, sessionId, sp.username, rolesArr, sp.x, sp.y,
          );
          this.remotePlayers.set(sessionId, rp);
        }
      });

      this.remotePlayers.forEach((_rp, sessionId) => {
        if (!serverPlayers.has(sessionId)) {
          this.remotePlayers.get(sessionId)?.destroy();
          this.remotePlayers.delete(sessionId);
        }
      });

      // ── Ship inventory ──────────────────────────────────────────────
      if (state.shipItems) {
        this.ship?.refreshState(state.shipItems);
      }
    });

    console.log(`[GameScene] Connected to GameRoom ${this.gameRoomId} as ${mySessionId}`);
  }

  // ── Tilemap ────────────────────────────────────────────────────────────

  private _buildTilemap(): Phaser.Physics.Arcade.StaticGroup {
    const wallsGroup = this.physics.add.staticGroup();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = MAP_GRID[row]?.[col] ?? TILE.GRASS;
        const x        = col * TILE_PX + TILE_PX / 2;
        const y        = row * TILE_PX + TILE_PX / 2;
        const scale    = TILE_PX / 16;

        let textureKey: string;
        let isCollidable = false;

        switch (tileType) {
          case TILE.WALL:
            textureKey   = Assets.tileWall.key;
            isCollidable = true;
            break;
          case TILE.WATER:
            textureKey   = Assets.tileWater.key;
            isCollidable = true;
            break;
          default:
            textureKey = Assets.tileGrass.key;
        }

        if (isCollidable) {
          const tile = wallsGroup.create(x, y, textureKey) as Phaser.Physics.Arcade.Image;
          tile.setScale(scale).refreshBody().setDepth(1);
        } else {
          this.add.image(x, y, textureKey).setScale(scale).setDepth(0);
        }
      }
    }

    return wallsGroup;
  }
}
