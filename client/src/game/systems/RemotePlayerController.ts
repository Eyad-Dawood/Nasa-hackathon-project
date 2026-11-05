import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme, getRoleHex } from "../../config/theme";
import { ANIM_KEYS } from "../data/AnimationKeys";

/** Lerp factor for smooth position interpolation (0–1, higher = snappier). */
const LERP = 0.18;

/**
 * RemotePlayerController
 * ──────────────────────
 * Renders a single remote player on the game world using server-synced positions.
 *
 * WHAT IT DOES:
 *   - Displays an animated sprite at the player's synced position.
 *   - Shows a username label above the sprite.
 *   - Lerps the sprite position each frame for smooth movement (hides network jitter).
 *   - Derives movement direction from lerp delta and plays the matching animation.
 *   - Plays idle animation when the player is not moving.
 *
 * WHAT IT DOES NOT DO:
 *   - Read any input.
 *   - Affect physics — remote players are visual-only (no colliders).
 *   - Know anything about the local player or game rules.
 *
 * HOW TO USE:
 *   const rp = new RemotePlayerController(scene, sessionId, username, roles, x, y);
 *   // Each frame:
 *   rp.updateTarget(newX, newY);
 *   rp.update();
 *   // On removal:
 *   rp.destroy();
 */
export class RemotePlayerController {
  readonly sessionId: string;

  private sprite: Phaser.GameObjects.Sprite;  // Sprite (not Image) for animations
  private label:  Phaser.GameObjects.Text;

  private targetX: number;
  private targetY: number;
  private prevX:   number;
  private prevY:   number;

  constructor(
    scene:     Phaser.Scene,
    sessionId: string,
    username:  string,
    roles:     string[],
    x:         number,
    y:         number,
  ) {
    this.sessionId = sessionId;
    this.targetX   = x;
    this.targetY   = y;
    this.prevX     = x;
    this.prevY     = y;

    // Use the same spritesheet as local player
    this.sprite = scene.add.sprite(x, y, Assets.playerIdle.key);
    this.sprite.setScale(2);
    this.sprite.setTint(getRoleHex(roles[0]));
    this.sprite.setDepth(10);
    this.sprite.setAlpha(0.9); // slightly transparent to distinguish from local player

    // Start idle
    this.sprite.play(ANIM_KEYS.playerIdle);

    // Username label
    this.label = scene.add.text(x, y - 24, username, {
      fontFamily:      Theme.font.family,
      fontSize:        "10px",
      color:           "#eaeaea",
      stroke:          "#000000",
      strokeThickness: 3,
    });
    this.label.setOrigin(0.5, 1).setDepth(11);
  }

  /**
   * Call this when a new server position arrives.
   * The sprite will lerp to this target over the next frames.
   */
  updateTarget(x: number, y: number): void {
    this.prevX   = this.targetX;
    this.prevY   = this.targetY;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Must be called every frame from GameScene.update().
   * Applies lerp and plays the correct directional animation.
   */
  update(): void {
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP);

    // Derive direction from movement delta (same 4-direction logic as PlayerController)
    const dx = this.targetX - this.prevX;
    const dy = this.targetY - this.prevY;
    const moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

    if (!moving) {
      this._playIfNotPlaying(ANIM_KEYS.playerIdle);
    } else if (Math.abs(dy) >= Math.abs(dx)) {
      // Vertical dominant
      this._playIfNotPlaying(dy > 0 ? ANIM_KEYS.playerWalkDown : ANIM_KEYS.playerWalkUp);
    } else {
      // Horizontal dominant
      this._playIfNotPlaying(dx > 0 ? ANIM_KEYS.playerWalkRight : ANIM_KEYS.playerWalkLeft);
    }

    // Keep label above sprite
    this.label.setPosition(this.sprite.x, this.sprite.y - 20);
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _playIfNotPlaying(key: string): void {
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key);
    }
  }
}
