/**
 * IInteractable.ts
 * ────────────────
 * Common interface for all world objects the player can interact with:
 *   - NpcController   ("E — Talk")
 *   - StationEntity   ("E — Access Station")
 *   - ShipEntity      ("E — Access Ship")
 *
 * InteractionSystem takes IInteractable[] and is agnostic to the concrete type.
 * Adding a new interactable object: implement this interface and pass it into
 * GameScene's interactable list.
 */

export interface IInteractable {
  /** World X position (pixels) — used for proximity detection. */
  readonly worldX: number;

  /** World Y position (pixels). */
  readonly worldY: number;

  /**
   * Text shown in the floating prompt when the player is in range.
   * Example: "E — Talk", "E — Access Station", "E — Access Ship".
   * Return a different string to indicate no-access, e.g. "⛔ No Access".
   */
  readonly interactionLabel: string;

  /**
   * Called once when the player presses E within range.
   * Should open the relevant UI (dialogue, menu, etc.).
   */
  onInteract(): void;

  /**
   * Called when the player walks out of range while this object was active.
   * Should close any open UI associated with this object.
   */
  onInteractEnd(): void;
}
