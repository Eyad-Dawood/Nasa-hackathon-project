import Phaser from "phaser";
import { Assets } from "../../config/assets";
import { Theme } from "../../config/theme";
import { IInteractable } from "../interfaces/IInteractable";
import { SHIP_WORLD_POS } from "../data/StationData";
import { CarrySystem } from "../systems/CarrySystem";
import { ShipMenuUI } from "../../ui/ShipMenuUI";
import { Objective } from "../data/ObjectiveData";

export interface ShipEntrySnapshot {
  instanceId: string;
  itemId: string;
  roleId: string;
  addedBy: string;
}

/**
 * ShipEntity
 * ──────────
 * The central spaceship that players deliver items to.
 * Implements IInteractable — anyone can interact with it.
 *
 * Ship inventory is server-authoritative (GameState.shipItems MapSchema).
 * This entity does NOT own inventory state — it reads from the latest
 * state snapshot passed in via refreshState() on every onStateChange.
 */
export class ShipEntity implements IInteractable {
  private _worldX:      number;
  private _worldY:      number;
  private _sprite:      Phaser.GameObjects.Image;
  private _label:       Phaser.GameObjects.Text;
  private _carry:       CarrySystem;
  private _playerRoles: string[];
  private _objective:   Objective | null;
  private _isHost:      boolean;
  private _menu:        ShipMenuUI | null = null;
  private _onConsultAi?: (contextPrompt?: string) => void;
  private _onLaunchMission?: () => void;

  /** Latest snapshot of ship items from the server (keyed by instanceId). */
  private _shipItemsSnapshot: Map<string, ShipEntrySnapshot> = new Map();

  constructor(
    scene:       Phaser.Scene,
    carry:       CarrySystem,
    playerRoles: string[],
    objective:   Objective | null,
    isHost:      boolean,
    onConsultAi?: (contextPrompt?: string) => void,
    onLaunchMission?: () => void,
    shipWorldPos?: { x: number; y: number },
  ) {
    this._carry       = carry;
    this._playerRoles = playerRoles;
    this._objective   = objective;
    this._isHost      = isHost;
    this._onConsultAi = onConsultAi;
    this._onLaunchMission = onLaunchMission;
    const pos = shipWorldPos ?? SHIP_WORLD_POS;
    this._worldX = pos.x;
    this._worldY = pos.y;

    this._sprite = scene.add.image(this._worldX, this._worldY, Assets.ship.key);
    this._sprite.setDisplaySize(96, 160).setDepth(5);

    this._label = scene.add.text(
      this._worldX,
      this._worldY - 88,
      "Artemis Assembly Bay",
      {
        fontFamily: Theme.font.family,
        fontSize: "10px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      },
    );
    this._label.setOrigin(0.5, 1).setDepth(11);
  }

  // ── IInteractable ────────────────────────────────────────────────────────

  get worldX(): number {
    return this._worldX;
  }
  get worldY(): number {
    return this._worldY;
  }
  get shipItemsSnapshot(): Map<string, ShipEntrySnapshot> {
    return this._shipItemsSnapshot;
  }
  get sprite(): Phaser.GameObjects.Image {
    return this._sprite;
  }

  setPosition(x: number, y: number): void {
    this._worldX = x;
    this._worldY = y;
    this._sprite.setPosition(x, y);
    this._label.setPosition(x, y - 88);
  }

  setObjective(objective: Objective | null): void {
    this._objective = objective;
    this._menu?.setObjective(objective);
  }

  setIsHost(isHost: boolean): void {
    this._isHost = isHost;
    this._menu?.setIsHost(isHost);
  }

  get interactionLabel(): string {
    return "E  —  Access Ship";
  }

  onInteract(): void {
    if (this._menu) return;

    this._menu = new ShipMenuUI(
      this._shipItemsSnapshot,
      this._carry,
      this._playerRoles,
      this._objective,
      this._isHost,
      () => {
        this._menu = null;
      },
      this._onConsultAi,
      this._onLaunchMission,
    );
    this._menu.mount();
  }

  onInteractEnd(): void {
    this._menu?.close();
    this._menu = null;
  }

  /**
   * Called by GameScene whenever Colyseus room state patches arrive.
   * Keeps the open menu in sync with server state.
   */
  refreshState(
    snapshot: Map<string, ShipEntrySnapshot>,
  ): void {
    this._shipItemsSnapshot = snapshot;
    this._menu?.refresh(snapshot);
  }
}
