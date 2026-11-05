import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme, getRoleHex } from "../../config/theme";

/** Lerp factor for smooth position interpolation (0–1, higher = snappier). */
const LERP = 0.18;

/**
 * RemotePlayerController
 * ──────────────────────
 * Renders a single remote player (not the local player) on the game world.
 *
 * WHAT IT DOES:
 *   - Displays a tinted sprite at the player's synced position.
 *   - Shows a username label above the sprite.
 *   - Lerps the sprite position each frame for smooth movement (hides network jitter).
 *   - Flips sprite horizontally when moving left.
 *
 * WHAT IT DOES NOT DO:
 *   - Read any input.
 *   - Affect physics — remote players are visual-only (no colliders).
 *   - Know anything about the local player or game rules.
 *
 * HOW TO USE:
 *   const rp = new RemotePlayerController(scene, sessionId, username, role, x, y);
 *   // Each frame:
 *   rp.updateTarget(newX, newY);
 *   rp.update();
 *   // On removal:
 *   rp.destroy();
 */
export class RemotePlayerController {
  readonly sessionId: string;

  private sprite: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;

  private targetX: number;
  private targetY: number;
  private prevX: number;

  constructor(
    scene: Phaser.Scene,
    sessionId: string,
    username: string,
    role: string,
    x: number,
    y: number
  ) {
    this.sessionId = sessionId;
    this.targetX = x;
    this.targetY = y;
    this.prevX = x;

    // Sprite — same texture as local player, tinted by role
    this.sprite = scene.add.image(x, y, Assets.player.key);
    this.sprite.setScale(2);
    this.sprite.setTint(getRoleHex(role));
    this.sprite.setDepth(10);
    this.sprite.setAlpha(0.9); // slightly transparent to distinguish from local player

    // Username label
    this.label = scene.add.text(x, y - 24, username, {
      fontFamily: Theme.font.family,
      fontSize: "10px",
      color: "#eaeaea",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.label.setOrigin(0.5, 1);
    this.label.setDepth(11);
  }

  /**
   * Call this when a new position arrives from the server state.
   * The sprite will lerp to this target over the next frames.
   */
  updateTarget(x: number, y: number): void {
    this.prevX = this.targetX;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Must be called every frame from GameScene.update().
   * Applies lerp and updates label position.
   */
  update(): void {
    // Lerp towards server-authoritative target position
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP);

    // Flip based on movement direction
    const movingLeft = this.targetX < this.prevX;
    const movingRight = this.targetX > this.prevX;
    if (movingLeft)       this.sprite.setFlipX(true);
    else if (movingRight) this.sprite.setFlipX(false);

    // Keep label above sprite
    this.label.setPosition(this.sprite.x, this.sprite.y - 20);
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }
}
