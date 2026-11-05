import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { ANIM_KEYS } from "../data/AnimationKeys";

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
 *   - Plays the correct directional walk animation (down/left/right/up).
 *   - Falls back to idle animation when stationary.
 *   - Collides with world bounds.
 *
 * DIRECTIONS:
 *   4-directional only (down/left/right/up). When moving diagonally the
 *   dominant axis determines the facing direction (vertical takes priority).
 *
 * ANIMATIONS:
 *   All animation keys come from AnimationKeys.ts. PlayerController never
 *   hard-codes animation key strings — it only imports ANIM_KEYS.
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
   * @param spawnX     World X in pixels.
   * @param spawnY     World Y in pixels.
   * @param roleTint   Phaser hex number used to tint the sprite per role.
   */
  constructor(
    scene:    Phaser.Scene,
    spawnX:   number,
    spawnY:   number,
    roleTint: number,
  ) {
    this._sprite = scene.physics.add.sprite(spawnX, spawnY, Assets.playerIdle.key);
    this._sprite.setTint(roleTint);
    this._sprite.setScale(2);               // 16px → 32px on screen
    this._sprite.setCollideWorldBounds(true);
    this._sprite.setDepth(10);

    // Start with idle animation
    this._sprite.play(ANIM_KEYS.playerIdle);

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

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const f = 1 / Math.SQRT2;
      vx *= f;
      vy *= f;
    }

    this._sprite.setVelocity(vx, vy);

    // ── Animation selection ──────────────────────────────────────────────
    // 4 directions only. Vertical movement (up/down) takes priority over
    // horizontal so that diagonal movement doesn't feel awkward.
    if (vx === 0 && vy === 0) {
      this._playIfNotPlaying(ANIM_KEYS.playerIdle);
    } else if (moveUp && !moveDown) {
      this._playIfNotPlaying(ANIM_KEYS.playerWalkUp);
    } else if (moveDown && !moveUp) {
      this._playIfNotPlaying(ANIM_KEYS.playerWalkDown);
    } else if (moveLeft) {
      this._playIfNotPlaying(ANIM_KEYS.playerWalkLeft);
    } else {
      this._playIfNotPlaying(ANIM_KEYS.playerWalkRight);
    }
  }

  // ── Public accessors ───────────────────────────────────────────────────

  get sprite(): Phaser.Physics.Arcade.Sprite { return this._sprite; }
  get worldX(): number { return this._sprite.x; }
  get worldY(): number { return this._sprite.y; }

  // ── Private ────────────────────────────────────────────────────────────

  /**
   * Play an animation only if it isn't already playing.
   * Avoids resetting the frame mid-cycle every frame.
   */
  private _playIfNotPlaying(key: string): void {
    if (this._sprite.anims.currentAnim?.key !== key) {
      this._sprite.play(key);
    }
  }
}
