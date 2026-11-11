import gameData from "../../../../game_data.json";

/**
 * ObjectiveData.ts  —  MASTER MISSION REGISTRY
 * ───────────────────────────────────────────────
 * Single source of truth for all 6 missions from game_data.json.
 *
 * WHY ONLY THE ID IS SENT TO THE SERVER:
 *   The server stores only `selectedObjectiveId` (and reads canonical mission
 *   constraints directly from game_data.json). The full Objective object is
 *   reconstructed client-side by getObjectiveById().
 */

export interface Objective {
  /** Unique identifier — stored on the server ("M01".."M06"). */
  id: string;

  /** Short display name (e.g. "Moon Explorer"). */
  label: string;

  /** Destination body (e.g. "The Moon"). */
  destination: string;

  /** One-sentence description for the selection UI. */
  description: string;

  /** Difficulty tier. */
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";

  /** Star rating 1–4. */
  stars: 1 | 2 | 3 | 4;

  /** Human-readable distance (e.g. "about 384,000 km"). */
  distanceKm: string;

  /** Travel time story (e.g. "about 3 days"). */
  travelTime: string;

  /** Fun fact shown on the mission card. */
  funFact: string;

  // ── Launch rule parameters (used by LaunchSystem.ts) ─────────────────
  distanceRating: number;
  sunlightPct: number;
  nightNeed: number;
  heatDanger: number;
  radiation: number;
  launchPull: number;
  signalNeed: number;
  navigationBrain: number;
  scienceGoal: number;
  starInstrumentId: string;
  starInstrument: string;
  budget: number;
}

const MISSION_DESCRIPTIONS: Record<string, string> = {
  M01: "A short hop to Earth's natural satellite.",
  M02: "Journey to the red desert world of our solar system.",
  M03: "Explore the icy ocean world orbiting Jupiter.",
  M04: "A quick trip to orbit — monitor Earth from above.",
  M05: "Brave intense heat and radiation to study our star.",
  M06: "Visit a moon with rivers of liquid methane.",
};

export const OBJECTIVES: Objective[] = gameData.missions.map((m) => ({
  id: m.id,
  label: m.name,
  destination: m.destination,
  description:
    MISSION_DESCRIPTIONS[m.id] ?? `Explore ${m.destination} (${m.distance_km}).`,
  difficulty: m.difficulty as Objective["difficulty"],
  stars: m.stars as Objective["stars"],
  distanceKm: m.distance_km,
  travelTime: m.travel_time_story,
  funFact: m.fun_fact,
  distanceRating: m.distance_rating,
  sunlightPct: m.sunlight_pct,
  nightNeed: m.night_need,
  heatDanger: m.heat_danger,
  radiation: m.radiation,
  launchPull: m.launch_pull,
  signalNeed: m.signal_need,
  navigationBrain: m.navigation_brain,
  scienceGoal: m.science_goal,
  starInstrumentId: m.star_instrument_id,
  starInstrument: m.star_instrument,
  budget: m.budget,
}));

/** Look up a full Objective by its id. Returns undefined if not found. */
export function getObjectiveById(id: string): Objective | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}
