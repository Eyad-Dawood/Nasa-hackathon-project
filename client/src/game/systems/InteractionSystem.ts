import Phaser from "phaser";
import { Theme } from "../../config/theme";
import { PlayerController } from "./PlayerController";
import { IInteractable } from "../interfaces/IInteractable";

/** Proximity radius in world pixels — prompt appears within this distance. */
export const INTERACTION_RANGE = 64;

/**
 * InteractionSystem  (generic)
 * ─────────────────────────────
 * Handles player ↔ world-object proximity detection and E-key dispatch.
 * Fully agnostic to the type of interactable (NPC, station, ship, etc.).
 *
 * WHAT IT DOES:
 *   - Every frame: finds the nearest IInteractable within INTERACTION_RANGE.
 *   - Shows a floating prompt ("E — Talk", "E — Access Station", …) above it.
 *   - On E key press: calls activeInteractable.onInteract().
 *   - If the player walks too far away: calls onInteractEnd() automatically.
 *
 * WHAT IT DOES NOT DO:
 *   - Render any dialogue box or menu (each interactable manages its own UI).
 *   - Know about NpcController, StationEntity, or ShipEntity specifically.
 *
 * HOW TO ADD A NEW INTERACTABLE:
 *   1. Implement IInteractable on your new class.
 *   2. Pass an instance into the interactables[] array given to GameScene.
 */
export class InteractionSystem {
  private scene:         Phaser.Scene;
  private player:        PlayerController;
  private interactables: IInteractable[];

  private keyE:          Phaser.Input.Keyboard.Key;
  private promptLabel:   Phaser.GameObjects.Text;

  private activeTarget:  IInteractable | null = null;
  private eWasDown:      boolean = false;
  private inputEnabled:  boolean = true;

  constructor(
    scene:         Phaser.Scene,
    player:        PlayerController,
    interactables: IInteractable[],
  ) {
    this.scene         = scene;
    this.player        = player;
    this.interactables = interactables;

    this.keyE = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.promptLabel = scene.add.text(0, 0, "", {
      fontFamily:      "'JetBrains Mono', monospace",
      fontSize:        "10px",
      color:           "#ffffff",
      backgroundColor: "rgba(8, 12, 20, 0.85)",
      padding:         { x: 8, y: 4 },
    });
    this.promptLabel.setOrigin(0.5, 1).setDepth(25).setVisible(false);
    this.promptLabel.setStroke("rgba(255, 255, 255, 0.25)", 1);
  }

  /** Call every frame from GameScene.update(). */
  update(): void {
    this._updateProximity();
    this._handleInput();
  }

  /** Add a new interactable at runtime (e.g. dynamically spawned objects). */
  addInteractable(obj: IInteractable): void {
    this.interactables.push(obj);
  }

  /** Disable/enable E-key interaction trigger (e.g. while typing in chat input). */
  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.eWasDown = false;
    }
  }

  // ── Private ────────────────────────────────────────────────────────────

  private _updateProximity(): void {
    // If we have an active target, check if player walked away
    if (this.activeTarget) {
      const dist = Phaser.Math.Distance.Between(
        this.player.worldX, this.player.worldY,
        this.activeTarget.worldX, this.activeTarget.worldY,
      );
      if (dist > INTERACTION_RANGE * 1.5) {
        this.activeTarget.onInteractEnd();
        this.activeTarget = null;
        this.promptLabel.setVisible(false);
      } else {
        // Keep prompt updated (label text may have changed, e.g. npc dialogue advancing)
        this.promptLabel
          .setPosition(this.activeTarget.worldX, this.activeTarget.worldY - 32)
          .setText(this.activeTarget.interactionLabel);
      }
      return;
    }

    // Find the nearest interactable within range
    let nearest:     IInteractable | null = null;
    let nearestDist: number               = Infinity;

    for (const obj of this.interactables) {
      const d = Phaser.Math.Distance.Between(
        this.player.worldX, this.player.worldY,
        obj.worldX, obj.worldY,
      );
      if (d < INTERACTION_RANGE && d < nearestDist) {
        nearest     = obj;
        nearestDist = d;
      }
    }

    this.activeTarget = nearest;

    if (nearest) {
      this.promptLabel
        .setPosition(nearest.worldX, nearest.worldY - 32)
        .setText(nearest.interactionLabel)
        .setVisible(true);
    } else {
      this.promptLabel.setVisible(false);
    }
  }

  private _handleInput(): void {
    const activeTag = document.activeElement?.tagName;
    const isDomInputFocused =
      activeTag === "INPUT" ||
      activeTag === "TEXTAREA" ||
      activeTag === "SELECT" ||
      (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);

    if (!this.inputEnabled || isDomInputFocused) {
      this.eWasDown = this.keyE.isDown;
      return;
    }

    const eDown = this.keyE.isDown;

    if (eDown && !this.eWasDown && this.activeTarget) {
      this.activeTarget.onInteract();
    }

    this.eWasDown = eDown;
  }
}
