import Phaser from "phaser";
import { Assets } from "../config/assets";
import { getRoleHex } from "../config/theme";
import {
  MAP_GRID, MAP_COLS, MAP_ROWS,
  TILE, TILE_PX, PLAYER_SPAWN_TILE,
} from "../game/data/MapData";
import { NPC_LIST } from "../game/data/NpcData";
import { Objective, OBJECTIVES, getObjectiveById } from "../game/data/ObjectiveData";
import { STATIONS, SHIP_WORLD_POS } from "../game/data/StationData";
import { PlayerController } from "../game/systems/PlayerController";
import { NpcController } from "../game/systems/NpcController";
import { InteractionSystem } from "../game/systems/InteractionSystem";
import { RemotePlayerController } from "../game/systems/RemotePlayerController";
import { CarrySystem } from "../game/systems/CarrySystem";
import { GameHUD } from "../game/ui/GameHUD";
import { StationEntity } from "../game/entities/StationEntity";
import { ShipEntity, ShipEntrySnapshot } from "../game/entities/ShipEntity";
import { IInteractable } from "../game/interfaces/IInteractable";
import { ColyseusService } from "../network/ColyseusService";
import { MissionAiTerminal } from "../ui/MissionAiTerminal";
import { MissionVictoryUI } from "../ui/MissionVictoryUI";
import { HyperspaceLaunchOverlay } from "../ui/HyperspaceLaunchOverlay";
import { getItemById } from "../game/data/ItemData";

/** How often (ms) the local player position is sent to the server. */
const MOVE_SEND_INTERVAL = 50; // 20 updates/sec

/**
 * GameScene  —  Top-level scene orchestrator.
 * ───────────────────────────────────────────
 * Wires all systems together and syncs authoritative state from GameRoom.
 */
export class GameScene extends Phaser.Scene {
  private username:   string    = "";
  private roles:      string[]  = ["no-role"];
  private gameRoomId: string    = "";
  private isHost:     boolean   = false;
  private objective:  Objective | null = null;

  private wallsGroup!:    Phaser.Physics.Arcade.StaticGroup;

  private player!:        PlayerController;
  private carry!:         CarrySystem;
  private npcs:           NpcController[]    = [];
  private stations:       StationEntity[]    = [];
  private ship!:          ShipEntity;
  private interaction!:   InteractionSystem;
  private hud!:           GameHUD;
  private aiTerminal!:    MissionAiTerminal;

  private remotePlayers:  Map<string, RemotePlayerController> = new Map();
  private moveSendTimer:  number = 0;
  private isShutDown:     boolean = false;

  constructor() { super({ key: "GameScene" }); }

  init(data: {
    username?:   string;
    roles?:      string[];
    gameRoomId?: string;
    isHost?:     boolean;
    objective?:  Objective | null;
  }) {
    this.username   = data?.username   ?? localStorage.getItem("username") ?? "Player";
    this.roles      = data?.roles      ?? ["powerAndThermal"];
    this.gameRoomId = data?.gameRoomId ?? "";
    this.isHost     = data?.isHost     ?? false;
    this.objective  = data?.objective  ?? null;
    this.isShutDown = false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#080a10");
    this.game.canvas.style.pointerEvents = "auto";
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    const worldW = MAP_COLS * TILE_PX;
    const worldH = MAP_ROWS * TILE_PX;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // 1. Tilemap
    this.wallsGroup = this._buildTilemap();

    // 2. Local player
    const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
    const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;
    const primaryRole = this.roles[0] ?? "no-role";

    this.player = new PlayerController(this, spawnX, spawnY, getRoleHex(primaryRole));
    this.physics.add.collider(this.player.sprite, this.wallsGroup);

    // 3. Carry system
    this.carry = new CarrySystem(this);

    // 4. NPCs
    this.npcs = NPC_LIST.map((def) => new NpcController(this, def));

    // 5. Stations
    this.stations = STATIONS.map(
      (def) => new StationEntity(this, def, this.roles, this.carry),
    );

    // 6. Spaceship
    this.ship = new ShipEntity(
      this,
      this.carry,
      this.roles,
      this.objective,
      this.isHost,
      (contextPrompt?: string) => {
        this.aiTerminal.open();
        if (contextPrompt) {
          this.aiTerminal.askPrompt(contextPrompt);
        }
      },
      () => {
        this._handleLaunchSequence();
      },
    );

    // 7. InteractionSystem
    const interactables: IInteractable[] = [
      ...this.npcs,
      ...this.stations,
      this.ship,
    ];
    this.interaction = new InteractionSystem(this, this.player, interactables);

    // 8. HUD
    this.hud = new GameHUD(this.username, this.roles, this.objective?.label);
    this.hud.mount();

    // 8b. NASA AI Mission Director Terminal
    this.aiTerminal = new MissionAiTerminal({
      objective: this.objective,
      playerRoles: this.roles,
      username: this.username,
      getShipEntity: () => this.ship,
      getHeldItemId: () => this.carry?.heldItem?.id ?? null,
      onFocusChange: (isFocused) => {
        this.player.setInputEnabled(!isFocused);
        this.interaction.setInputEnabled(!isFocused);
        if (this.input.keyboard) {
          this.input.keyboard.enabled = !isFocused;
          if (isFocused) {
            this.input.keyboard.resetKeys();
          }
        }
      },
      onLaunchMission: () => {
        this._handleLaunchSequence();
      },
    });
    this.aiTerminal.mount();

    // 9. Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // 10. Connect to GameRoom
    this._connectToGameRoom(spawnX, spawnY);
  }

  update(_time: number, delta: number) {
    this.player.update();
    this.carry.update(this.player.worldX, this.player.worldY);
    this.interaction.update();
    this.npcs.forEach((npc) => npc.update());
    this.remotePlayers.forEach((rp) => rp.update());

    this.moveSendTimer += delta;
    if (this.moveSendTimer >= MOVE_SEND_INTERVAL) {
      this.moveSendTimer = 0;
      if (ColyseusService.room) {
        ColyseusService.sendMove(this.player.worldX, this.player.worldY);
      }
    }
  }

  shutdown() {
    this.isShutDown = true;
    this.hud?.destroy();
    this.aiTerminal?.destroy();
    this.remotePlayers.forEach((rp) => rp.destroy());
    this.remotePlayers.clear();
    this.npcs = [];
    this.stations = [];
    ColyseusService.leaveRoom();
  }

  // ── Multiplayer ────────────────────────────────────────────────────────

  private async _connectToGameRoom(spawnX: number, spawnY: number): Promise<void> {
    const alreadyConnected =
      ColyseusService.room !== null && ColyseusService.room.name === "game";

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
          this.isHost,
        );
      } catch (e) {
        console.error("[GameScene] Failed to join GameRoom:", e);
        return;
      }
    }

    if (this.isShutDown) return;

    const room = ColyseusService.room;
    if (!room) return;
    const mySessionId = room.sessionId;

    const syncFromState = (state: any) => {
      if (this.isShutDown || !state) return;

      // Sync host promotion
      if (state.hostId) {
        const nowHost = mySessionId === state.hostId;
        if (nowHost !== this.isHost) {
          this.isHost = nowHost;
          this.ship?.setIsHost(nowHost);
        }
      }

      // Sync active mission objective
      if (state.selectedObjectiveId && state.selectedObjectiveId !== this.objective?.id) {
        const syncedObj = getObjectiveById(state.selectedObjectiveId);
        if (syncedObj) {
          this.objective = syncedObj;
          this.hud?.refresh(this.username, this.roles, syncedObj.label);
          this.ship?.setObjective(syncedObj);
          this.aiTerminal?.setObjective(syncedObj);
        }
      }

      // Sync remote players
      const serverPlayers: Map<string, any> = state.players;
      if (serverPlayers) {
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
      }

      // Sync ship inventory (keyed by instanceId)
      if (state.shipItems) {
        const snapshot = new Map<string, ShipEntrySnapshot>();
        state.shipItems.forEach((entry: any, key: string) => {
          snapshot.set(key, {
            instanceId: entry.instanceId || key,
            itemId: entry.itemId,
            roleId: entry.roleId,
            addedBy: entry.addedBy,
          });
        });
        this.ship?.refreshState(snapshot);
        this.aiTerminal?.refreshTelemetry();
      }
    };

    if (room.state) {
      syncFromState(room.state);
    }

    room.onStateChange((state: any) => {
      syncFromState(state);
    });

    this.aiTerminal?.bindNetworkListeners();
  }

  private _handleLaunchSequence(): void {
    this.cameras.main.shake(1600, 0.015);

    this.tweens.add({
      targets: this.ship.sprite,
      y: -350,
      duration: 1800,
      ease: "Power2.easeIn",
      onComplete: () => {
        const items = Array.from(this.ship.shipItemsSnapshot.values());
        const totalMass = items.reduce((sum, e) => {
          const def = getItemById(e.itemId);
          return sum + (def?.mass ?? 0);
        }, 0);

        const currentObjective = this.objective ?? OBJECTIVES[0];

        const hyperspaceOverlay = new HyperspaceLaunchOverlay({
          missionLabel: currentObjective.label,
          totalWeight: totalMass,
          onComplete: () => {
            const victoryUI = new MissionVictoryUI({
              objective: currentObjective,
              totalMass,
              username: this.username,
              isHost: this.isHost || !ColyseusService.room,
              onNextMission: (nextObj) => {
                this.ship.sprite.setPosition(SHIP_WORLD_POS.x, SHIP_WORLD_POS.y);
                if (ColyseusService.room && this.isHost) {
                  ColyseusService.sendNextMission(nextObj.id);
                } else {
                  this.objective = nextObj;
                  this.hud.refresh(this.username, this.roles, nextObj.label);
                  this.ship.setObjective(nextObj);
                  this.aiTerminal.setObjective(nextObj);
                }
              },
              onClose: () => {
                this.ship.sprite.setPosition(SHIP_WORLD_POS.x, SHIP_WORLD_POS.y);
              },
            });
            victoryUI.mount();
          },
        });
        hyperspaceOverlay.mount();
      },
    });
  }

  // ── Tilemap ────────────────────────────────────────────────────────────

  private _buildTilemap(): Phaser.Physics.Arcade.StaticGroup {
    const wallsGroup = this.physics.add.staticGroup();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = MAP_GRID[row]?.[col] ?? TILE.GRASS;
        const x        = col * TILE_PX + TILE_PX / 2;
        const y        = row * TILE_PX + TILE_PX / 2;

        let textureKey: string;
        let isCollidable = false;

        switch (tileType) {
          case TILE.WALL:
            textureKey   = Assets.tileWall.key;
            isCollidable = true;
            break;
          default:
            textureKey   = Assets.tileGrass.key;
            isCollidable = false;
        }

        if (isCollidable) {
          const tile = wallsGroup.create(x, y, textureKey) as Phaser.Physics.Arcade.Image;
          tile.setScale(1).refreshBody().setDepth(1);
        } else {
          this.add.image(x, y, textureKey).setScale(1).setDepth(0);
        }
      }
    }

    return wallsGroup;
  }
}
