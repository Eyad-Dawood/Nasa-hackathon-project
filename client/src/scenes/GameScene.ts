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
import { getLevelLayout, LevelLayout } from "../game/data/LevelLayouts";
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
import { SoundFX } from "../audio/SoundEffects";

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

  private keyGHandler:    ((e: KeyboardEvent) => void) | null = null;
  private lastGPressTime: number = 0;

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

    // Get level-specific architectural blueprint and environmental styling
    const level = this.objective?.level ?? 1;
    const layout = getLevelLayout(level);

    // 1. Tilemap with level-specific room layout and palette
    this.wallsGroup = this._buildTilemap(layout);

    // 1b. High-tech Floor Sector Decals & Power Conduits
    this._buildRoomDecorations(layout);

    // 2. Local player spawned at level-specific airlock
    const spawnX = layout.spawnTile.col * TILE_PX + TILE_PX / 2;
    const spawnY = layout.spawnTile.row * TILE_PX + TILE_PX / 2;
    const primaryRole = this.roles[0] ?? "no-role";

    this.player = new PlayerController(this, spawnX, spawnY, getRoleHex(primaryRole));
    this.physics.add.collider(this.player.sprite, this.wallsGroup);

    // 3. Carry system
    this.carry = new CarrySystem(this);

    // 4. NPCs placed at level's control hub
    this.npcs = [
      new NpcController(this, {
        ...NPC_LIST[0],
        tileCol: layout.npcTile.col,
        tileRow: layout.npcTile.row,
      }),
    ];

    // 5. Stations positioned tailored to room architecture
    this.stations = layout.stations.map(
      (def) =>
        new StationEntity(
          this,
          def,
          this.roles,
          this.carry,
          (locked: boolean) => {
            this.player.setInputEnabled(!locked);
            this.interaction.setInputEnabled(!locked);
            if (this.input.keyboard) {
              this.input.keyboard.enabled = !locked;
              if (locked) {
                this.input.keyboard.resetKeys();
              }
            }
          },
        ),
    );

    // 6. Spaceship on the gantry excavation pad
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
      layout.shipWorldPos,
    );

    // 7. InteractionSystem
    const interactables: IInteractable[] = [
      ...this.npcs,
      ...this.stations,
      this.ship,
    ];
    this.interaction = new InteractionSystem(this, this.player, interactables);

    // 8. HUD
    const hudTitle = this.objective ? `LVL ${this.objective.level} · ${this.objective.label}` : "Awaiting Directive";
    this.hud = new GameHUD(
      this.username,
      this.roles,
      hudTitle,
      () => {
        this._handleExitGame();
      },
      () => {
        this._triggerAutoFillCheat();
      },
    );
    this.hud.mount();

    // 8a. Developer Magic Double-Tap 'G' Cheat Listener
    this.keyGHandler = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea (e.g. AI Terminal)
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "g" || e.key === "G") {
        const now = Date.now();
        if (now - this.lastGPressTime <= 450) {
          this._triggerAutoFillCheat();
          this.lastGPressTime = 0;
        } else {
          this.lastGPressTime = now;
        }
      }
    };
    window.addEventListener("keydown", this.keyGHandler);

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
      onDevAutoFill: () => {
        this._triggerAutoFillCheat();
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
    if (this.keyGHandler) {
      window.removeEventListener("keydown", this.keyGHandler);
      this.keyGHandler = null;
    }
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
          const oldLevel = this.objective?.level;
          this.objective = syncedObj;
          if (oldLevel !== undefined && oldLevel !== syncedObj.level) {
            // Rebuild scene with new level architectural blueprint
            this.scene.restart({
              username: this.username,
              roles: this.roles,
              gameRoomId: this.gameRoomId,
              isHost: this.isHost,
              objective: syncedObj,
            });
            return;
          }
          this.hud?.refresh(this.username, this.roles, `LVL ${syncedObj.level} · ${syncedObj.label}`);
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
                if (ColyseusService.room && this.isHost) {
                  ColyseusService.sendNextMission(nextObj.id, true);
                } else {
                  this.scene.restart({
                    username: this.username,
                    roles: this.roles,
                    gameRoomId: this.gameRoomId,
                    isHost: this.isHost,
                    objective: nextObj,
                  });
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

  private _handleExitGame(): void {
    this.shutdown();
    ColyseusService.leaveRoom();
    // Return to LobbyScene cleanly
    this.scene.start("LobbyScene", {
      username: this.username,
      roles: this.roles,
    });
  }

  /**
   * Developer Magic Cheat:
   * Instantly packs the spacecraft with a 100% verified 12/12 canonical build
   * for the active mission, bypassing manual item fetch for testing.
   */
  private _triggerAutoFillCheat(): void {
    SoundFX.playRoleSelect();

    // Canonical 12/12 builds for all 6 missions
    const CANONICAL_BUILDS: Record<string, string[]> = {
      M01: ["SC02", "SC13", "CM05", "CM04", "CM01", "PT20", "SI04", "SC07", "PT14", "PT05", "PT11", "PT17"],
      M02: ["SC03", "SC14", "CM07", "PT20", "PT20", "SI14", "SI04", "SI06", "SC09", "PT14", "PT14", "PT14", "PT06", "PT17", "PT17"],
      M03: ["SC05", "SC17", "CM09", "PT21", "PT20", "SI19", "SI19", "SI07", "SI06", "SC08", "SC09", "PT14", "PT14", "PT14", "PT14", "PT06", "PT05", "PT11", "PT11", "PT19", "SC19"],
      M04: ["SC02", "SC12", "CM02", "CM02", "CM01", "CM01", "PT20", "SI02", "PT14", "PT01", "PT01", "PT08", "PT17"],
      M05: ["SC05", "SC16", "CM07", "CM02", "CM01", "PT21", "PT20", "SI12", "SI19", "SI06", "SC08", "SC08", "SC08", "PT14", "PT16", "PT01", "PT01", "PT18", "PT17", "PT17"],
      M06: ["SC05", "SC17", "CM09", "CM03", "PT21", "PT20", "PT20", "SI16", "SI19", "SI19", "SI10", "SI06", "CM13", "SC07", "SC07", "PT14", "PT14", "PT14", "PT14", "PT14", "PT06", "PT06", "PT11", "PT11", "PT19", "SC18", "SC18", "PT18", "PT17"],
    };

    const missionId = this.objective?.id || "M01";
    const itemIds = CANONICAL_BUILDS[missionId] || CANONICAL_BUILDS.M01;
    const snapshot = new Map<string, ShipEntrySnapshot>();
    itemIds.forEach((itemId, idx) => {
      const itemDef = getItemById(itemId);
      snapshot.set(`cheat_${missionId}_${idx}`, {
        instanceId: `cheat_${missionId}_${idx}`,
        itemId,
        roleId: itemDef?.roleId || "commander",
        addedBy: "DEV-CHEAT",
      });
    });

    // Instant local client state & telemetry refresh
    this.ship?.refreshState(snapshot);
    this.aiTerminal?.refreshTelemetry();

    // If connected to Colyseus GameRoom, sync authoritative state to all peers
    if (ColyseusService.room) {
      ColyseusService.devAutoFillShip();
    }

    this.hud?.showCheatToast("⚡ CHEAT ACTIVATED: 12/12 LAUNCH READY!");
  }

  // ── Tilemap & Architecture ─────────────────────────────────────────────

  private _buildTilemap(layout: LevelLayout): Phaser.Physics.Arcade.StaticGroup {
    const wallsGroup = this.physics.add.staticGroup();
    const { floorTint, wallTint } = layout.palette;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = layout.grid[row]?.[col] ?? TILE.GRASS;
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
          tile.setDisplaySize(TILE_PX, TILE_PX).refreshBody().setDepth(1).setTint(wallTint);
        } else {
          this.add.image(x, y, textureKey).setDisplaySize(TILE_PX, TILE_PX).setDepth(0).setTint(floorTint);
        }
      }
    }

    return wallsGroup;
  }

  /**
   * Builds level-specific decorative elements:
   *   1. Visual floor power conduits connecting stations to the central rocket bay.
   *   2. High-tech Floor Sector Emblem Plaque.
   *   3. Atmospheric ambient floating dust/gas particles.
   */
  private _buildRoomDecorations(layout: LevelLayout): void {
    const graphics = this.add.graphics();
    graphics.setDepth(0.4);

    // 1. Draw glowing circuit conduits from each station to the Ship Assembly Bay
    const shipCenter = layout.shipWorldPos;
    graphics.lineStyle(2, layout.palette.conduitColor, 0.45);

    layout.stations.forEach((st) => {
      const sx = st.tileCol * TILE_PX + TILE_PX / 2;
      const sy = st.tileRow * TILE_PX + TILE_PX / 2;

      // Draw clean orthogonal circuit traces to ship
      graphics.beginPath();
      graphics.moveTo(sx, sy);
      graphics.lineTo(sx, shipCenter.y);
      graphics.lineTo(shipCenter.x, shipCenter.y);
      graphics.strokePath();

      // Station junction terminal circle
      graphics.fillStyle(layout.palette.conduitColor, 0.6);
      graphics.fillCircle(sx, sy, 4);
    });

    // 2. High-Tech Floor Sector Emblem Plaque
    const plaqueX = (MAP_COLS * TILE_PX) / 2;
    const plaqueY = 28;

    const bannerBg = this.add.graphics();
    bannerBg.setDepth(0.6);
    bannerBg.fillStyle(0x040810, 0.75);
    bannerBg.fillRoundedRect(plaqueX - 180, plaqueY - 14, 360, 26, 6);
    bannerBg.lineStyle(1, layout.palette.wallTint, 0.4);
    bannerBg.strokeRoundedRect(plaqueX - 180, plaqueY - 14, 360, 26, 6);

    const bannerText = this.add.text(
      plaqueX,
      plaqueY - 1,
      layout.sectorTag,
      {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        color: layout.palette.accentColor,
        stroke: "#000000",
        strokeThickness: 2,
      },
    );
    bannerText.setOrigin(0.5, 0.5).setDepth(0.7);

    // 3. Subtle atmospheric particles floating in the room
    const particles = this.add.particles(0, 0, Assets.itemPlaceholder.key, {
      x: { min: 32, max: MAP_COLS * TILE_PX - 32 },
      y: { min: 32, max: MAP_ROWS * TILE_PX - 32 },
      speedY: { min: -10, max: -3 },
      speedX: { min: -5, max: 5 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.45, end: 0 },
      tint: layout.palette.particleColor,
      lifespan: 3000,
      frequency: 200,
      quantity: 1,
    });
    particles.setDepth(2);
  }
}
