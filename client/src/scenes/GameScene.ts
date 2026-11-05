import Phaser from "phaser";
import { Assets } from "../config/assets";
import { getRoleHex } from "../config/theme";
import { MAP_GRID, MAP_COLS, MAP_ROWS, TILE, TILE_PX, PLAYER_SPAWN_TILE } from "../game/data/MapData";
import { NPC_LIST } from "../game/data/NpcData";
import { PlayerController } from "../game/systems/PlayerController";
import { NpcController } from "../game/systems/NpcController";
import { InteractionSystem } from "../game/systems/InteractionSystem";
import { GameHUD } from "../game/ui/GameHUD";

/**
 * GameScene
 * ─────────
 * Top-level orchestrator for the game world. Thin wiring layer only.
 *
 * WHAT LIVES HERE:
 *   - Tilemap building (reads MapData — no hardcoded tile logic)
 *   - Instantiation of all systems (PlayerController, NpcController, etc.)
 *   - Physics collider setup
 *   - Camera configuration
 *   - Per-frame update delegation
 *
 * WHAT DOES NOT LIVE HERE:
 *   - Movement math  → PlayerController
 *   - NPC dialogue   → NpcController + InteractionSystem
 *   - HUD HTML       → GameHUD
 *   - Map/NPC data   → MapData.ts / NpcData.ts
 *
 * DATA PASSED IN via scene.start("GameScene", { username, roleId }):
 *   username  — local player's display name
 *   roleId    — one of "role1" | "role2" | "role3" | "role4"
 *               used to tint the player sprite and show role badge in HUD
 */
export class GameScene extends Phaser.Scene {
  // ── Scene data ───────────────────────────────────────────────────────
  private username: string = "";
  private roleId: string = "role1";

  // ── Systems ──────────────────────────────────────────────────────────
  private player!: PlayerController;
  private npcs: NpcController[] = [];
  private interaction!: InteractionSystem;
  private hud!: GameHUD;

  // ── Physics groups ───────────────────────────────────────────────────
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { username?: string; roleId?: string }) {
    this.username = data?.username ?? localStorage.getItem("username") ?? "Player";
    this.roleId   = data?.roleId   ?? "role1";
  }

  create() {
    const worldW = MAP_COLS * TILE_PX;
    const worldH = MAP_ROWS * TILE_PX;

    // ── 1. World bounds ───────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // ── 2. Tilemap ────────────────────────────────────────────────────
    this.wallsGroup = this._buildTilemap();

    // ── 3. Player ─────────────────────────────────────────────────────
    const spawnX = PLAYER_SPAWN_TILE.col * TILE_PX + TILE_PX / 2;
    const spawnY = PLAYER_SPAWN_TILE.row * TILE_PX + TILE_PX / 2;
    this.player = new PlayerController(this, spawnX, spawnY, getRoleHex(this.roleId));

    // Player collides with walls
    this.physics.add.collider(this.player.sprite, this.wallsGroup);

    // ── 4. NPCs ───────────────────────────────────────────────────────
    this.npcs = NPC_LIST.map((def) => new NpcController(this, def));

    // ── 5. Interaction system ─────────────────────────────────────────
    this.interaction = new InteractionSystem(this, this.player, this.npcs);

    // ── 6. HUD ────────────────────────────────────────────────────────
    this.hud = new GameHUD(this.username, this.roleId);
    this.hud.mount();

    // ── 7. Camera ─────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  update(_time: number, _delta: number) {
    this.player.update();
    this.interaction.update();
  }

  shutdown() {
    this.hud?.destroy();
    this.npcs = [];
  }

  // ── Private ───────────────────────────────────────────────────────────

  /**
   * Reads MAP_GRID and places tile images.
   * Wall tiles are added to a StaticGroup so physics colliders can be added.
   * Returns the walls StaticGroup for the caller to set up colliders.
   *
   * To add a new tile type:
   *  1. Add a TILE constant in MapData.ts
   *  2. Add a texture key in assets.ts
   *  3. Generate its texture in BootScene._generatePlaceholderTextures()
   *  4. Add a case in the switch below
   */
  private _buildTilemap(): Phaser.Physics.Arcade.StaticGroup {
    const wallsGroup = this.physics.add.staticGroup();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tileType = MAP_GRID[row]?.[col] ?? TILE.GRASS;
        const x = col * TILE_PX + TILE_PX / 2;
        const y = row * TILE_PX + TILE_PX / 2;

        let textureKey: string;
        let isCollidable = false;

        switch (tileType) {
          case TILE.WALL:
            textureKey = Assets.tileWall.key;
            isCollidable = true;
            break;
          case TILE.WATER:
            textureKey = Assets.tileWater.key;
            isCollidable = true;   // water blocks movement (placeholder)
            break;
          case TILE.GRASS:
          default:
            textureKey = Assets.tileGrass.key;
            break;
        }

        if (isCollidable) {
          // Add to static physics group so colliders work
          const tile = wallsGroup.create(x, y, textureKey) as Phaser.Physics.Arcade.Image;
          tile.setScale(MAP_COLS > 0 ? TILE_PX / 16 : 1);
          tile.refreshBody();
          tile.setDepth(1);
        } else {
          // Non-collidable floor tile
          const img = this.add.image(x, y, textureKey);
          img.setScale(TILE_PX / 16);
          img.setDepth(0);
        }
      }
    }

    return wallsGroup;
  }
}
