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

  /** Campaign progression level number (1 through 6). */
  level: number;

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

/**
 * Canonical campaign progression order:
 * Level 1: Earth Watcher (Low Earth Orbit - M04)
 * Level 2: Moon Explorer (The Moon - M01)
 * Level 3: Red Planet Explorer (Mars - M02)
 * Level 4: Ice Moon Explorer (Europa - M03)
 * Level 5: Sun Watcher (Close to Sun - M05)
 * Level 6: Titan Explorer (Titan/Saturn - M06)
 */
export const CAMPAIGN_MISSION_IDS = ["M04", "M01", "M02", "M03", "M05", "M06"] as const;

export function getLevelNumber(missionId: string): number {
  const idx = CAMPAIGN_MISSION_IDS.indexOf(missionId as any);
  return idx >= 0 ? idx + 1 : 1;
}

export function getMissionIdByLevel(level: number): string {
  const bounded = Math.max(1, Math.min(level, CAMPAIGN_MISSION_IDS.length));
  return CAMPAIGN_MISSION_IDS[bounded - 1];
}

const MISSION_DESCRIPTIONS: Record<string, string> = {
  M01: "A short hop to Earth's natural satellite.",
  M02: "Journey to the red desert world of our solar system.",
  M03: "Explore the icy ocean world orbiting Jupiter.",
  M04: "A quick trip to orbit — monitor Earth from above.",
  M05: "Brave intense heat and radiation to study our star.",
  M06: "Visit a moon with rivers of liquid methane.",
};

export const OBJECTIVES: Objective[] = gameData.missions
  .map((m) => ({
    id: m.id,
    level: getLevelNumber(m.id),
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
  }))
  .sort((a, b) => a.level - b.level);

/** Look up a full Objective by its id. Returns undefined if not found. */
export function getObjectiveById(id: string): Objective | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}
