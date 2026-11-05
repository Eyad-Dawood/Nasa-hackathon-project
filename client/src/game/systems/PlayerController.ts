import Phaser from "phaser";
import { Assets } from "../../config/assets";

/** Player movement speed in pixels per second. */
const PLAYER_SPEED = 100;

/**
 * PlayerController
 * ────────────────
 * Owns the player sprite and handles all movement mechanics.
 *
 * WHAT IT DOES:
 *   - Creates an arcade-physics sprite at the given world position.
 *   - Reads WASD + arrow keys every frame and applies velocity.
 *   - Normalises diagonal movement (no speed boost when moving diagonally).
 *   - Flips the sprite horizontally based on movement direction.
 *   - Collides with world bounds.
 *
 * WHAT IT DOES NOT DO:
 *   - Know anything about NPCs, dialogue, the HUD, or roles.
 *   - Contain any game-specific data.
 *   - Render or manage any UI.
 *
 * HOW TO USE:
 *   const player = new PlayerController(scene, spawnX, spawnY, roleTint);
 *   scene.physics.add.collider(player.sprite, wallsGroup);
 *   // in update:
 *   player.update();
 */
export class PlayerController {
  private _sprite: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up:    Phaser.Input.Keyboard.Key;
    down:  Phaser.Input.Keyboard.Key;
    left:  Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  /**
   * @param scene      The Phaser scene this controller lives in.
   * @param spawnX     World X in pixels (top-left of spawn tile).
   * @param spawnY     World Y in pixels (top-left of spawn tile).
   * @param roleTint   Phaser hex number used to tint the player sprite per role.
   */
  constructor(
    scene: Phaser.Scene,
    spawnX: number,
    spawnY: number,
    roleTint: number
  ) {
    // Create physics sprite, centred on the spawn tile
    this._sprite = scene.physics.add.sprite(spawnX, spawnY, Assets.player.key);
    this._sprite.setTint(roleTint);
    this._sprite.setScale(2); // 16px texture → 32px on screen
    this._sprite.setCollideWorldBounds(true);
    this._sprite.setDepth(10); // render above tiles

    // Input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  /** Must be called every frame from GameScene.update(). */
  update(): void {
    const { up, down, left, right } = this.cursors;
    const w = this.wasd;

    const moveUp    = up.isDown    || w.up.isDown;
    const moveDown  = down.isDown  || w.down.isDown;
    const moveLeft  = left.isDown  || w.left.isDown;
    const moveRight = right.isDown || w.right.isDown;

    let vx = 0;
    let vy = 0;

    if (moveLeft)  vx -= PLAYER_SPEED;
    if (moveRight) vx += PLAYER_SPEED;
    if (moveUp)    vy -= PLAYER_SPEED;
    if (moveDown)  vy += PLAYER_SPEED;

    // Normalize diagonal movement so it doesn't feel faster
    if (vx !== 0 && vy !== 0) {
      const factor = 1 / Math.SQRT2;
      vx *= factor;
      vy *= factor;
    }

    this._sprite.setVelocity(vx, vy);

    // Flip sprite when moving left/right
    if (moveLeft)       this._sprite.setFlipX(true);
    else if (moveRight) this._sprite.setFlipX(false);
  }

  // ── Public accessors ──────────────────────────────────────────────────

  get sprite(): Phaser.Physics.Arcade.Sprite {
    return this._sprite;
  }

  get worldX(): number {
    return this._sprite.x;
  }

  get worldY(): number {
    return this._sprite.y;
  }
}
