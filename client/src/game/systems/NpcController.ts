import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme } from "../../config/theme";
import { NpcDefinition } from "../data/NpcData";
import { TILE_PX } from "../data/MapData";

/**
 * NpcController
 * ─────────────
 * Owns a single NPC sprite and its dialogue state machine.
 * Driven externally by InteractionSystem — does NOT read input itself.
 *
 * WHAT IT DOES:
 *   - Places an NPC sprite at the correct world position.
 *   - Renders a small name label above the sprite.
 *   - Tracks dialogue state: open/closed, current line index.
 *
 * WHAT IT DOES NOT DO:
 *   - Listen to keyboard input.
 *   - Render the dialogue box (InteractionSystem does that).
 *   - Contain any game logic.
 */
export class NpcController {
  readonly def: NpcDefinition;

  private _sprite: Phaser.GameObjects.Image;
  private _nameLabel: Phaser.GameObjects.Text;
  private _lineIndex: number = 0;
  private _isOpen: boolean = false;

  /**
   * @param scene  The Phaser scene.
   * @param def    NPC definition from NpcData.ts (position, dialogue, name).
   */
  constructor(scene: Phaser.Scene, def: NpcDefinition) {
    this.def = def;

    const worldX = def.tileCol * TILE_PX + TILE_PX / 2;
    const worldY = def.tileRow * TILE_PX + TILE_PX / 2;

    // Sprite — static image (not physics; NPCs don't move in this iteration)
    this._sprite = scene.add.image(worldX, worldY, Assets.npc.key);
    this._sprite.setScale(2);
    this._sprite.setDepth(10);

    // Name label floating above
    this._nameLabel = scene.add.text(worldX, worldY - 24, def.name, {
      fontFamily: Theme.font.family,
      fontSize: "10px",
      color: "#f4d03f",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this._nameLabel.setOrigin(0.5, 1);
    this._nameLabel.setDepth(11);
  }

  // ── Dialogue state machine ─────────────────────────────────────────────

  /** Open the dialogue box and show the first line. */
  startDialogue(): void {
    this._lineIndex = 0;
    this._isOpen = true;
  }

  /**
   * Advance to the next dialogue line.
   * If on the last line, closes the dialogue instead.
   */
  advance(): void {
    this._lineIndex++;
    if (this._lineIndex >= this.def.dialogue.length) {
      this.close();
    }
  }

  /** Force-close the dialogue (e.g. player walks away). */
  close(): void {
    this._isOpen = false;
    this._lineIndex = 0;
  }

  // ── Public accessors ───────────────────────────────────────────────────

  get sprite(): Phaser.GameObjects.Image {
    return this._sprite;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  /** The dialogue line that should currently be displayed. */
  get currentLine(): string {
    return this.def.dialogue[this._lineIndex] ?? "";
  }

  /** True when the currently displayed line is the last one. */
  get isLastLine(): boolean {
    return this._lineIndex >= this.def.dialogue.length - 1;
  }

  get worldX(): number { return this._sprite.x; }
  get worldY(): number { return this._sprite.y; }
}
