/**
 * ObjectiveData.ts
 * ────────────────
 * PLACEHOLDER DATA — replace freely when real objectives are designed.
 * This file is a pure data module. Zero mechanics code lives here.
 *
 * HOW TO ADD A REAL OBJECTIVE:
 *   1. Add an entry to OBJECTIVES with a unique `id`.
 *   2. Add any new fields to the Objective interface.
 *   3. The ObjectiveScene and GameScene will pick them up automatically.
 *   4. Update GameState.ts on the server if you need to sync more than just `id`.
 *
 * WHY ONLY THE ID IS SENT TO THE SERVER:
 *   The server stores only `selectedObjectiveId` (a string).
 *   The full Objective object is reconstructed on each client by looking up
 *   the id in this file — no need to sync the entire object over the network.
 *   This keeps the schema lean and makes adding fields here a client-only change.
 */

/** Full definition of a single objective. All data, no methods. */
export interface Objective {
  /** Unique identifier — stored on the server and used to look up this entry. */
  id: string;

  /** Short display name shown in the selection UI. */
  label: string;

  /** One-sentence description shown below the label in the picker. */
  description: string;

  // ── Future fields (examples — uncomment when needed) ──────────────────
  // difficulty: "easy" | "medium" | "hard";
  // mapArea: string;
  // rewardXp: number;
  // requiredRoles?: string[];
}

/**
 * All selectable objectives.
 * Edit freely — ObjectiveScene reads this list directly.
 */
export const OBJECTIVES: Objective[] = [
  {
    id: "obj_placeholder_1",
    label: "Objective 1",
    description: "Placeholder — real gameplay objective TBD.",
  },
  {
    id: "obj_placeholder_2",
    label: "Objective 2",
    description: "Placeholder — real gameplay objective TBD.",
  },
  {
    id: "obj_placeholder_3",
    label: "Objective 3",
    description: "Placeholder — real gameplay objective TBD.",
  },
];

/**
 * Look up a full Objective by its id.
 * Returns undefined if the id is not found.
 */
export function getObjectiveById(id: string): Objective | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}
