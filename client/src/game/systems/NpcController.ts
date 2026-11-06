import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme } from "../../config/theme";
import { NpcDefinition } from "../data/NpcData";
import { TILE_PX } from "../data/MapData";
import { IInteractable } from "../interfaces/IInteractable";

/** Dialogue box dimensions (screen-space). */
const BOX_W          = 400;
const BOX_H          = 90;
const BOX_MARGIN_BTM = 20;

/**
 * NpcController
 * ─────────────
 * Owns a single NPC sprite, its dialogue state machine, and the in-game
 * dialogue box rendering.
 *
 * Implements IInteractable so InteractionSystem can call it generically.
 *
 * WHAT IT DOES:
 *   - Places an NPC sprite at the correct world position.
 *   - Renders a small name label above the sprite.
 *   - Tracks dialogue state: open/closed, current line index.
 *   - Renders its own dialogue box (screen-space Graphics + Text objects).
 *   - update() must be called every frame from GameScene.
 *
 * WHAT IT DOES NOT DO:
 *   - Listen to keyboard input (InteractionSystem handles that).
 *   - Contain any game logic.
 */
export class NpcController implements IInteractable {
  readonly def: NpcDefinition;

  private _sprite:    Phaser.GameObjects.Image;
  private _nameLabel: Phaser.GameObjects.Text;

  // Dialogue state
  private _lineIndex: number  = 0;
  private _isOpen:    boolean = false;

  // Screen-space dialogue box (created once, shown/hidden)
  private _box:      Phaser.GameObjects.Graphics;
  private _nameText: Phaser.GameObjects.Text;
  private _bodyText: Phaser.GameObjects.Text;
  private _hintText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, def: NpcDefinition) {
    this.def = def;

    const wx = def.tileCol * TILE_PX + TILE_PX / 2;
    const wy = def.tileRow * TILE_PX + TILE_PX / 2;

    this._sprite = scene.add.image(wx, wy, Assets.npc.key);
    this._sprite.setScale(1).setDepth(10);

    this._nameLabel = scene.add.text(wx, wy - 20, def.name, {
      fontFamily: Theme.font.family,
      fontSize:   "10px",
      color:      "#ffffff",
      stroke:     "#000000",
      strokeThickness: 3,
    });
    this._nameLabel.setOrigin(0.5, 1).setDepth(11);

    // ── Dialogue box (screen-space — hidden by default) ─────────────────
    const { width, height } = scene.scale;
    const bx = (width  - BOX_W) / 2;
    const by =  height - BOX_H - BOX_MARGIN_BTM;

    this._box = scene.add.graphics();
    this._box.setScrollFactor(0).setDepth(30).setVisible(false);

    this._nameText = scene.add.text(bx + 14, by + 5, "", {
      fontFamily: Theme.font.family,
      fontSize:   "11px",
      color:      "#f4d03f",
    });
    this._nameText.setScrollFactor(0).setDepth(31).setVisible(false);

    this._bodyText = scene.add.text(bx + 14, by + 30, "", {
      fontFamily: Theme.font.family,
      fontSize:   "12px",
      color:      "#eaeaea",
      wordWrap:   { width: BOX_W - 28 },
    });
    this._bodyText.setScrollFactor(0).setDepth(31).setVisible(false);

    this._hintText = scene.add.text(bx + BOX_W - 14, by + BOX_H - 8, "", {
      fontFamily: Theme.font.family,
      fontSize:   "10px",
      color:      "#8888aa",
    });
    this._hintText.setOrigin(1, 1).setScrollFactor(0).setDepth(31).setVisible(false);
  }

  // ── IInteractable ───────────────────────────────────────────────────────

  get interactionLabel(): string { return "E  —  Talk"; }

  onInteract(): void {
    if (this._isOpen) {
      this.advance();
    } else {
      this.startDialogue();
    }
  }

  onInteractEnd(): void {
    this.close();
  }

  // ── Dialogue state machine ──────────────────────────────────────────────

  startDialogue(): void {
    this._lineIndex = 0;
    this._isOpen    = true;
  }

  advance(): void {
    this._lineIndex++;
    if (this._lineIndex >= this.def.dialogue.length) this.close();
  }

  close(): void {
    this._isOpen    = false;
    this._lineIndex = 0;
    this._hideBox();
  }

  // ── update — must be called every frame ────────────────────────────────

  update(): void {
    if (this._isOpen) {
      this._renderBox();
    } else {
      this._hideBox();
    }
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  get sprite():    Phaser.GameObjects.Image { return this._sprite; }
  get isOpen():    boolean { return this._isOpen; }
  get currentLine():string { return this.def.dialogue[this._lineIndex] ?? ""; }
  get isLastLine():boolean { return this._lineIndex >= this.def.dialogue.length - 1; }
  get worldX():    number  { return this._sprite.x; }
  get worldY():    number  { return this._sprite.y; }

  // ── Private ─────────────────────────────────────────────────────────────

  private _renderBox(): void {
    const scene  = this._box.scene;
    const { width, height } = scene.scale;
    const bx = (width  - BOX_W) / 2;
    const by =  height - BOX_H - BOX_MARGIN_BTM;

    this._box.clear();
    this._box.fillStyle(0x000000, 0.5);
    this._box.fillRoundedRect(bx + 4, by + 4, BOX_W, BOX_H, 6);
    this._box.fillStyle(Theme.game.dialogueBg, 1);
    this._box.fillRoundedRect(bx, by, BOX_W, BOX_H, 6);
    this._box.lineStyle(2, Theme.game.dialogueBorder, 1);
    this._box.strokeRoundedRect(bx, by, BOX_W, BOX_H, 6);
    this._box.fillStyle(Theme.game.dialogueBorder, 0.25);
    this._box.fillRoundedRect(bx, by, BOX_W, 24, { tl: 6, tr: 6, bl: 0, br: 0 });

    this._nameText.setPosition(bx + 14, by + 5).setText(this.def.name.toUpperCase()).setVisible(true);
    this._bodyText.setPosition(bx + 14, by + 30).setText(this.currentLine).setVisible(true);
    this._hintText
      .setPosition(bx + BOX_W - 14, by + BOX_H - 8)
      .setText(this.isLastLine ? "E — Close" : "E — Next")
      .setVisible(true);
    this._box.setVisible(true);
  }

  private _hideBox(): void {
    this._box.clear();
    this._box.setVisible(false);
    this._nameText.setVisible(false);
    this._bodyText.setVisible(false);
    this._hintText.setVisible(false);
  }
}
