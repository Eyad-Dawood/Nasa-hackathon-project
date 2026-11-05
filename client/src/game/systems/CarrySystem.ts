import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme, getRoleHex } from "../../config/theme";
import { GameItem } from "../data/ItemData";

/**
 * CarrySystem
 * ───────────
 * Tracks what the local player is currently holding and renders a small
 * item indicator floating above the player sprite.
 *
 * RULES:
 *   - Only one item can be held at a time.
 *   - The indicator is a tinted 8×8 sprite with the item name below it.
 *   - CarrySystem is local-only (not synced to other players yet).
 *
 * HOW TO USE:
 *   carry.pickUp(item)        — pick up an item (fails if already holding one)
 *   carry.putDown()           — drop the held item, returns it
 *   carry.heldItem            — currently held GameItem | null
 *   carry.isHolding           — boolean shortcut
 *   carry.update(playerX, Y)  — call every frame to position the indicator
 */
export class CarrySystem {
  private _heldItem: GameItem | null = null;

  private _sprite: Phaser.GameObjects.Image;
  private _label:  Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this._sprite = scene.add.image(0, 0, Assets.itemPlaceholder.key);
    this._sprite.setScale(1.5).setDepth(15).setVisible(false);

    this._label = scene.add.text(0, 0, "", {
      fontFamily:      Theme.font.family,
      fontSize:        "8px",
      color:           "#ffffff",
      stroke:          "#000000",
      strokeThickness: 2,
    });
    this._label.setOrigin(0.5, 0).setDepth(16).setVisible(false);
  }

  // ── API ─────────────────────────────────────────────────────────────────

  /**
   * Pick up an item. Returns true if successful, false if already holding one.
   * GameScene / StationEntity should check the return value.
   */
  pickUp(item: GameItem): boolean {
    if (this._heldItem !== null) return false;

    this._heldItem = item;
    this._sprite.setTint(getRoleHex(item.roleId)).setVisible(true);
    this._label.setText(item.name).setVisible(true);
    return true;
  }

  /**
   * Drop the held item. Returns the item (so caller can send it to the ship),
   * or null if nothing was held.
   */
  putDown(): GameItem | null {
    const item     = this._heldItem;
    this._heldItem = null;
    this._sprite.setVisible(false);
    this._label.setVisible(false);
    return item;
  }

  /** Must be called every frame from GameScene.update() to follow the player. */
  update(playerX: number, playerY: number): void {
    if (!this._heldItem) return;
    this._sprite.setPosition(playerX, playerY - 22);
    this._label.setPosition(playerX, playerY - 14);
  }

  get heldItem():  GameItem | null { return this._heldItem; }
  get isHolding(): boolean         { return this._heldItem !== null; }
}
