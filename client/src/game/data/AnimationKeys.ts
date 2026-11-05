/**
 * AnimationKeys.ts  —  CENTRALIZED ANIMATION REGISTRY
 * ─────────────────────────────────────────────────────
 * Single source of truth for every sprite animation in the game.
 *
 * HOW TO ADD A NEW ANIMATION:
 *   1. Add a key constant to ANIM_KEYS.
 *   2. Add an entry to ANIM_DEFS with the frame config.
 *   3. Call registerAnimations(scene) once (BootScene already does this).
 *   4. Play it anywhere with sprite.play(ANIM_KEYS.yourKey).
 *
 * HOW TO ADD A NEW SPRITE SHEET:
 *   1. Add the texture key to assets.ts.
 *   2. Load it in BootScene.preload() (or add to REMOTE_ASSETS if URL-based).
 *   3. Add anim entries here referencing that texture key.
 *
 * DIRECTION CONVENTION (Walk spritesheet row order):
 *   Row 0 → facing DOWN
 *   Row 1 → facing LEFT
 *   Row 2 → facing RIGHT
 *   Row 3 → facing UP
 */

/** All animation key strings used throughout the game. */
export const ANIM_KEYS = {
  // ── Player ────────────────────────────────────────────────────────────
  playerIdle:      "player_idle",
  playerWalkDown:  "player_walk_down",
  playerWalkLeft:  "player_walk_left",
  playerWalkRight: "player_walk_right",
  playerWalkUp:    "player_walk_up",
} as const;

export type AnimKey = typeof ANIM_KEYS[keyof typeof ANIM_KEYS];

/** Frame rate for all walk animations (frames per second). */
const WALK_FPS  = 8;
/** Frame rate for the idle animation. */
const IDLE_FPS  = 4;

interface AnimDef {
  key:        string;
  textureKey: string;
  /** Frame indices within the spritesheet (Phaser auto-numbers left→right, row-by-row). */
  frames:     number[];
  frameRate:  number;
  repeat:     number; // -1 = loop forever
}

/**
 * Definitions for every animation.
 * To change frame order or FPS: edit here only.
 *
 * Walk.png layout (64×64, 16×16 frames, 4 cols × 4 rows):
 *   Row 0 (frames  0– 3) → down
 *   Row 1 (frames  4– 7) → left
 *   Row 2 (frames  8–11) → right
 *   Row 3 (frames 12–15) → up
 *
 * Idle.png layout (64×16, 16×16 frames, 4 cols × 1 row):
 *   Frames 0–3 → idle loop
 */
export const ANIM_DEFS: AnimDef[] = [
  // ── Idle ──────────────────────────────────────────────────────────────
  {
    key:        ANIM_KEYS.playerIdle,
    textureKey: "player_idle",
    frames:     [0, 1, 2, 3],
    frameRate:  IDLE_FPS,
    repeat:     -1,
  },

  // ── Walk (4 directions) ───────────────────────────────────────────────
  {
    key:        ANIM_KEYS.playerWalkDown,
    textureKey: "player_walk",
    frames:     [0, 1, 2, 3],
    frameRate:  WALK_FPS,
    repeat:     -1,
  },
  {
    key:        ANIM_KEYS.playerWalkLeft,
    textureKey: "player_walk",
    frames:     [4, 5, 6, 7],
    frameRate:  WALK_FPS,
    repeat:     -1,
  },
  {
    key:        ANIM_KEYS.playerWalkRight,
    textureKey: "player_walk",
    frames:     [8, 9, 10, 11],
    frameRate:  WALK_FPS,
    repeat:     -1,
  },
  {
    key:        ANIM_KEYS.playerWalkUp,
    textureKey: "player_walk",
    frames:     [12, 13, 14, 15],
    frameRate:  WALK_FPS,
    repeat:     -1,
  },
];

/**
 * Register all animations defined in ANIM_DEFS into Phaser's global
 * animation manager.  Call once in BootScene.create() after spritesheets
 * have been loaded.  Any scene or sprite can then play them by key.
 */
export function registerAnimations(scene: Phaser.Scene): void {
  for (const def of ANIM_DEFS) {
    // Skip if already registered (scene restart safety)
    if (scene.anims.exists(def.key)) continue;

    scene.anims.create({
      key:       def.key,
      frames:    scene.anims.generateFrameNumbers(def.textureKey, { frames: def.frames }),
      frameRate: def.frameRate,
      repeat:    def.repeat,
    });
  }
}
