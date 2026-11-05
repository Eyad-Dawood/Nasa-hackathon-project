import Phaser from "phaser";
import { Theme } from "../../config/theme";
import { PlayerController } from "./PlayerController";
import { NpcController } from "./NpcController";

/** Distance in world pixels within which the interaction prompt appears. */
export const INTERACTION_RANGE = 64;

/** Width of the dialogue box in pixels. */
const BOX_W = 400;
/** Height of the dialogue box in pixels. */
const BOX_H = 90;
/** Bottom margin from screen bottom. */
const BOX_MARGIN_BOTTOM = 20;

/**
 * InteractionSystem
 * ─────────────────
 * Coordinates player ↔ NPC proximity detection, the "E — Talk" prompt,
 * and the in-game dialogue box.
 *
 * WHAT IT DOES:
 *   - Every frame: finds the nearest NPC within INTERACTION_RANGE.
 *   - Shows/hides a floating "E — Talk" prompt above that NPC.
 *   - On E key press:
 *       · If no dialogue open  → calls npc.startDialogue()
 *       · If dialogue open     → calls npc.advance() (or closes on last line)
 *   - Renders the dialogue box (Graphics + Text) when an NPC dialogue is open.
 *   - If the player walks out of range mid-dialogue, closes dialogue automatically.
 *
 * WHAT IT DOES NOT DO:
 *   - Own any sprites.
 *   - Contain any dialogue strings or NPC data.
 *   - Affect physics.
 */
export class InteractionSystem {
  private scene: Phaser.Scene;
  private player: PlayerController;
  private npcs: NpcController[];

  // E key
  private keyE: Phaser.Input.Keyboard.Key;

  // Prompt label (floats above nearest NPC)
  private promptLabel: Phaser.GameObjects.Text;

  // Dialogue box (fixed to camera — rendered in screen space via setScrollFactor)
  private dialogueBox: Phaser.GameObjects.Graphics;
  private dialogueNameText: Phaser.GameObjects.Text;
  private dialogueBodyText: Phaser.GameObjects.Text;
  private dialogueHintText: Phaser.GameObjects.Text;

  // Currently active NPC (the one whose dialogue is open, or nearest in range)
  private activeNpc: NpcController | null = null;

  // Debounce: prevent E being read multiple times on one press
  private eWasDown: boolean = false;

  constructor(
    scene: Phaser.Scene,
    player: PlayerController,
    npcs: NpcController[]
  ) {
    this.scene = scene;
    this.player = player;
    this.npcs = npcs;

    this.keyE = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // ── Prompt label ─────────────────────────────────────────────────────
    this.promptLabel = scene.add.text(0, 0, "E  —  Talk", {
      fontFamily: Theme.font.family,
      fontSize: "11px",
      color: "#f4d03f",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.promptLabel.setOrigin(0.5, 1);
    this.promptLabel.setDepth(20);
    this.promptLabel.setVisible(false);

    // ── Dialogue box (screen-space — setScrollFactor(0)) ─────────────────
    const { width, height } = scene.scale;
    const boxX = (width  - BOX_W) / 2;
    const boxY =  height - BOX_H - BOX_MARGIN_BOTTOM;

    this.dialogueBox = scene.add.graphics();
    this.dialogueBox.setScrollFactor(0);
    this.dialogueBox.setDepth(30);
    this.dialogueBox.setVisible(false);

    // NPC name (header)
    this.dialogueNameText = scene.add.text(boxX + 14, boxY + 10, "", {
      fontFamily: Theme.font.family,
      fontSize: "11px",
      color: "#f4d03f",
    });
    this.dialogueNameText.setScrollFactor(0);
    this.dialogueNameText.setDepth(31);
    this.dialogueNameText.setVisible(false);

    // Dialogue body
    this.dialogueBodyText = scene.add.text(boxX + 14, boxY + 28, "", {
      fontFamily: Theme.font.family,
      fontSize: "12px",
      color: "#eaeaea",
      wordWrap: { width: BOX_W - 28 },
    });
    this.dialogueBodyText.setScrollFactor(0);
    this.dialogueBodyText.setDepth(31);
    this.dialogueBodyText.setVisible(false);

    // "E — Next / Close" hint in bottom-right of box
    this.dialogueHintText = scene.add.text(boxX + BOX_W - 14, boxY + BOX_H - 10, "", {
      fontFamily: Theme.font.family,
      fontSize: "10px",
      color: "#8888aa",
    });
    this.dialogueHintText.setOrigin(1, 1);
    this.dialogueHintText.setScrollFactor(0);
    this.dialogueHintText.setDepth(31);
    this.dialogueHintText.setVisible(false);
  }

  /**
   * Must be called every frame from GameScene.update().
   */
  update(): void {
    this._updateProximity();
    this._handleInput();
    this._renderDialogue();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** Find nearest NPC and show/hide the interaction prompt. */
  private _updateProximity(): void {
    // If dialogue is open, keep the same activeNpc — don't switch mid-dialogue
    if (this.activeNpc?.isOpen) {
      // Auto-close if player walks too far away
      const dist = Phaser.Math.Distance.Between(
        this.player.worldX, this.player.worldY,
        this.activeNpc.worldX, this.activeNpc.worldY
      );
      if (dist > INTERACTION_RANGE * 1.5) {
        this.activeNpc.close();
        this.activeNpc = null;
        this._hideDialogue();
        this.promptLabel.setVisible(false);
      }
      return;
    }

    // Find nearest NPC in range
    let nearest: NpcController | null = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.worldX, this.player.worldY,
        npc.worldX, npc.worldY
      );
      if (d < INTERACTION_RANGE && d < nearestDist) {
        nearest = npc;
        nearestDist = d;
      }
    }

    this.activeNpc = nearest;

    if (nearest) {
      this.promptLabel.setPosition(nearest.worldX, nearest.worldY - 28);
      this.promptLabel.setVisible(true);
    } else {
      this.promptLabel.setVisible(false);
    }
  }

  /** Handle E key press for opening/advancing dialogue. */
  private _handleInput(): void {
    const eDown = this.keyE.isDown;

    if (eDown && !this.eWasDown) {
      // Rising edge — single trigger per press
      if (this.activeNpc) {
        if (this.activeNpc.isOpen) {
          this.activeNpc.advance();
          if (!this.activeNpc.isOpen) {
            this._hideDialogue();
          }
        } else {
          this.activeNpc.startDialogue();
          this.promptLabel.setVisible(false);
        }
      }
    }

    this.eWasDown = eDown;
  }

  /** Draw / update the dialogue box content. */
  private _renderDialogue(): void {
    const npc = this.activeNpc;
    if (!npc?.isOpen) {
      this._hideDialogue();
      return;
    }

    const { width, height } = this.scene.scale;
    const boxX = (width  - BOX_W) / 2;
    const boxY =  height - BOX_H - BOX_MARGIN_BOTTOM;

    // Redraw box background
    this.dialogueBox.clear();
    // Shadow
    this.dialogueBox.fillStyle(0x000000, 0.5);
    this.dialogueBox.fillRoundedRect(boxX + 4, boxY + 4, BOX_W, BOX_H, 6);
    // Background
    this.dialogueBox.fillStyle(Theme.game.dialogueBg, 1);
    this.dialogueBox.fillRoundedRect(boxX, boxY, BOX_W, BOX_H, 6);
    // Border
    this.dialogueBox.lineStyle(2, Theme.game.dialogueBorder, 1);
    this.dialogueBox.strokeRoundedRect(boxX, boxY, BOX_W, BOX_H, 6);
    // Name accent bar (top 22px)
    this.dialogueBox.fillStyle(Theme.game.dialogueBorder, 0.25);
    this.dialogueBox.fillRoundedRect(boxX, boxY, BOX_W, 24, { tl: 6, tr: 6, bl: 0, br: 0 });

    // Update texts
    this.dialogueNameText.setPosition(boxX + 14, boxY + 5);
    this.dialogueNameText.setText(npc.def.name.toUpperCase());

    this.dialogueBodyText.setPosition(boxX + 14, boxY + 30);
    this.dialogueBodyText.setText(npc.currentLine);

    const hint = npc.isLastLine ? "E — Close" : "E — Next";
    this.dialogueHintText.setPosition(boxX + BOX_W - 14, boxY + BOX_H - 8);
    this.dialogueHintText.setText(hint);

    // Show all
    this.dialogueBox.setVisible(true);
    this.dialogueNameText.setVisible(true);
    this.dialogueBodyText.setVisible(true);
    this.dialogueHintText.setVisible(true);
  }

  /** Hide all dialogue box elements. */
  private _hideDialogue(): void {
    this.dialogueBox.setVisible(false);
    this.dialogueNameText.setVisible(false);
    this.dialogueBodyText.setVisible(false);
    this.dialogueHintText.setVisible(false);
  }
}
