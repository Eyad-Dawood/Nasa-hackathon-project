import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme, getRoleHex, getRoleLabel } from "../../config/theme";

import { IInteractable } from "../interfaces/IInteractable";
import { StationDefinition, stationWorldPos } from "../data/StationData";
import { getItemsByRole } from "../data/ItemData";
import { StationMenuUI } from "../../ui/StationMenuUI";
import { CarrySystem } from "../systems/CarrySystem";

/**
 * StationEntity
 * ─────────────
 * A role-locked corner station that players interact with to pick up items.
 * Implements IInteractable so InteractionSystem can handle proximity + E key.
 *
 * ACCESS RULE:
 *   The player's roles[] array is passed in. If it contains this station's
 *   roleId, the player can open the station menu. Otherwise the prompt says
 *   "⛔ No Access" and onInteract() does nothing.
 *
 * CARRY DEPENDENCY:
 *   StationEntity receives the CarrySystem reference so it can:
 *     - Tell CarrySystem to pick up an item when the player selects one.
 *     - Show a "Return Item" button when the player is carrying an item from this role.
 */
export class StationEntity implements IInteractable {
  readonly def: StationDefinition;

  private _worldX: number;
  private _worldY: number;
  private _sprite:     Phaser.GameObjects.Image;
  private _label:      Phaser.GameObjects.Text;
  private _hasAccess:  boolean;
  private _carry:      CarrySystem;
  private _menu:       StationMenuUI | null = null;
  private _onInputLock?: (locked: boolean) => void;

  constructor(
    scene:      Phaser.Scene,
    def:        StationDefinition,
    playerRoles: string[],
    carry:      CarrySystem,
    onInputLock?: (locked: boolean) => void,
  ) {
    this.def         = def;
    this._carry      = carry;
    this._hasAccess  = playerRoles.includes(def.roleId);
    this._onInputLock = onInputLock;

    const { x, y } = stationWorldPos(def);
    this._worldX = x;
    this._worldY = y;

    // Workstation sprite — dedicated 64×64 NASA Console per role
    const workstationKeyMap: Record<string, string> = {
      powerAndThermal: Assets.stationPower.key,
      structureAndComputing: Assets.stationStructure.key,
      Communications: Assets.stationCommunications.key,
      Science: Assets.stationScience.key,
    };
    const textureKey = workstationKeyMap[def.roleId] || Assets.station.key;

    this._sprite = scene.add.image(x, y, textureKey);
    this._sprite.setScale(1).setDepth(5);
    if (!this._hasAccess) this._sprite.setAlpha(0.55); // dim if no access

    // Label above workstation
    this._label = scene.add.text(x, y - 40, getRoleLabel(def.roleId), {
      fontFamily:      Theme.font.family,
      fontSize:        "10px",
      color:           "#ffffff",
      stroke:          "#000000",
      strokeThickness: 3,
    });
    this._label.setOrigin(0.5, 1).setDepth(11);
  }

  // ── IInteractable ────────────────────────────────────────────────────────

  get worldX(): number { return this._worldX; }
  get worldY(): number { return this._worldY; }

  get interactionLabel(): string {
    return this._hasAccess ? "E  —  Access Station" : "⛔  No Access";
  }

  onInteract(): void {
    if (!this._hasAccess) return;
    if (this._menu) return; // already open

    const items = getItemsByRole(this.def.roleId);
    this._menu = new StationMenuUI(
      this.def,
      items,
      this._carry,
      () => {
        this._menu = null;
        this._onInputLock?.(false);
      },
      this._onInputLock,
    );
    this._menu.mount();
  }

  onInteractEnd(): void {
    this._menu?.close();
    this._menu = null;
    this._onInputLock?.(false);
  }
}
