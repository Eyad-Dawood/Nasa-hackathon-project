import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme } from "../../config/theme";
import { IInteractable } from "../interfaces/IInteractable";
import { SHIP_WORLD_POS } from "../data/StationData";
import { CarrySystem } from "../systems/CarrySystem";
import { ShipMenuUI } from "../../ui/ShipMenuUI";
import { ColyseusService } from "../../network/ColyseusService";

/**
 * ShipEntity
 * ──────────
 * The central spaceship that players deliver items to.
 * Implements IInteractable — anyone can interact with it.
 *
 * Opening the ship menu allows:
 *   - Adding the carried item to the ship.
 *   - Viewing the ship manifest (grouped by role, with total weight).
 *   - Removing any item (player carries it back to the station).
 *
 * Ship inventory is server-authoritative (GameState.shipItems MapSchema).
 * This entity does NOT own inventory state — it reads from the latest
 * state snapshot passed in via refreshState() on every onStateChange.
 */
export class ShipEntity implements IInteractable {
  private _worldX: number;
  private _worldY: number;
  private _sprite: Phaser.GameObjects.Image;
  private _label:  Phaser.GameObjects.Text;
  private _carry:  CarrySystem;
  private _menu:   ShipMenuUI | null = null;

  /** Latest snapshot of ship items from the server. Updated by GameScene. */
  private _shipItemsSnapshot: Map<string, { itemId: string; roleId: string; addedBy: string }> = new Map();

  constructor(scene: Phaser.Scene, carry: CarrySystem) {
    this._carry  = carry;
    this._worldX = SHIP_WORLD_POS.x;
    this._worldY = SHIP_WORLD_POS.y;

    this._sprite = scene.add.image(this._worldX, this._worldY, Assets.ship.key);
    this._sprite.setScale(3).setDepth(5);

    this._label = scene.add.text(this._worldX, this._worldY - 48, "🚀 Spaceship", {
      fontFamily:      Theme.font.family,
      fontSize:        "11px",
      color:           "#aaffcc",
      stroke:          "#000000",
      strokeThickness: 3,
    });
    this._label.setOrigin(0.5, 1).setDepth(11);
  }

  // ── IInteractable ────────────────────────────────────────────────────────

  get worldX(): number { return this._worldX; }
  get worldY(): number { return this._worldY; }
  get interactionLabel(): string { return "E  —  Access Ship"; }

  onInteract(): void {
    if (this._menu) return;

    this._menu = new ShipMenuUI(
      this._shipItemsSnapshot,
      this._carry,
      () => { this._menu = null; },      // onClose
    );
    this._menu.mount();
  }

  onInteractEnd(): void {
    this._menu?.close();
    this._menu = null;
  }

  // ── State sync (called by GameScene on every onStateChange) ─────────────

  /**
   * Updates the local snapshot of ship items from the server state.
   * If the ship menu is currently open, refreshes it immediately.
   */
  refreshState(shipItems: Map<string, any>): void {
    this._shipItemsSnapshot = new Map();
    shipItems.forEach((entry: any, key: string) => {
      this._shipItemsSnapshot.set(key, {
        itemId:  entry.itemId,
        roleId:  entry.roleId,
        addedBy: entry.addedBy,
      });
    });

    // Live-refresh the open menu if any
    this._menu?.refresh(this._shipItemsSnapshot);
  }
}
