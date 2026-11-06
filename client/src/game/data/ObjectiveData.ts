/**
 * ObjectiveData.ts  —  MASTER MISSION REGISTRY
 * ───────────────────────────────────────────────
 * Single source of truth for all 6 missions from game_data.json.
 *
 * HOW TO ADD A NEW MISSION:
 *   1. Add an entry to OBJECTIVES with a unique `id`.
 *   2. Add any new fields to the Objective interface.
 *   3. ObjectiveScene, ObjectivePicker, LaunchSystem pick them up automatically.
 *
 * WHY ONLY THE ID IS SENT TO THE SERVER:
 *   The server stores only `selectedObjectiveId`.
 *   Full Objective is reconstructed client-side by getObjectiveById().
 *   Adding fields here is a client-only change.
 */

/** Full mission definition. All data, no methods. */
export interface Objective {
  /** Unique identifier — stored on the server. */
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

  /** Fun fact shown on the mission card. */
  funFact: string;

  /** Travel time story (e.g. "about 3 days"). */
  travelTime: string;

  // ── Launch rule parameters (used by LaunchSystem.ts) ─────────────────

  /**
   * Distance rating — multiplied by highest engine fuelBurn to find
   * minimum fuel needed.
   */
  distanceRating: number;

  /**
   * Sunlight percentage at destination.
   * Solar panel output = powerMade × (sunlightPct / 100).
   * Values > 100 mean closer than Earth (e.g. Sun Watcher = 300).
   */
  sunlightPct: number;

  /**
   * Battery storage needed to survive one night (if any solar is used).
   * 0 = no night / always lit (Sun Watcher).
   */
  nightNeed: number;

  /** Heat danger rating — total heatProtection must be ≥ this. */
  heatDanger: number;

  /** Radiation level — total radiationProtection must be ≥ this. */
  radiation: number;

  /**
   * Launch pull factor — total thrust must be ≥ totalMass × (launchPull − noseConeReduction).
   */
  launchPull: number;

  /** Signal range needed — best radio range + boosters must be ≥ this. */
  signalNeed: number;

  /**
   * Brain power needed just for navigation.
   * Total brain = brainPower + brainBonus.
   * Requirement = navigationBrain + sum(instrument.brainUse).
   */
  navigationBrain: number;

  /** Minimum science points required. +10 bonus if star instrument is on the ship. */
  scienceGoal: number;

  /** ID of the star instrument for this mission. Including it gives +10 science. */
  starInstrumentId: string;

  /** Name of the star instrument (for display). */
  starInstrument: string;

  /** Credit budget — total ship cost must be ≤ this. */
  budget: number;
}

export const OBJECTIVES: Objective[] = [
  {
    id:              "M01",
    label:           "Moon Explorer",
    destination:     "The Moon",
    description:     "A short hop to Earth's natural satellite.",
    difficulty:      "Easy",
    stars:           1,
    distanceKm:      "about 384,000 km",
    travelTime:      "about 3 days",
    funFact:         "A night on the Moon lasts about 14 Earth days.",
    distanceRating:  5,
    sunlightPct:     100,
    nightNeed:       40,
    heatDanger:      2,
    radiation:       1,
    launchPull:      1.0,
    signalNeed:      1,
    navigationBrain: 2,
    scienceGoal:     30,
    starInstrumentId:"SI04",
    starInstrument:  "HD Camera",
    budget:          250,
  },
  {
    id:              "M02",
    label:           "Red Planet Explorer",
    destination:     "Mars",
    description:     "Journey to the red desert world of our solar system.",
    difficulty:      "Medium",
    stars:           2,
    distanceKm:      "about 225 million km",
    travelTime:      "about 7 months",
    funFact:         "Mars has the tallest volcano known in our solar system.",
    distanceRating:  20,
    sunlightPct:     50,
    nightNeed:       20,
    heatDanger:      5,
    radiation:       3,
    launchPull:      1.2,
    signalNeed:      3,
    navigationBrain: 8,
    scienceGoal:     60,
    starInstrumentId:"SI14",
    starInstrument:  "Rock & Soil Analyzer",
    budget:          450,
  },
  {
    id:              "M03",
    label:           "Ice Moon Explorer",
    destination:     "Europa (moon of Jupiter)",
    description:     "Explore the icy ocean world orbiting Jupiter.",
    difficulty:      "Hard",
    stars:           3,
    distanceKm:      "about 630 million km",
    travelTime:      "about 5 years",
    funFact:         "Europa may hide a giant ocean under its ice.",
    distanceRating:  40,
    sunlightPct:     10,
    nightNeed:       20,
    heatDanger:      7,
    radiation:       7,
    launchPull:      1.3,
    signalNeed:      5,
    navigationBrain: 18,
    scienceGoal:     100,
    starInstrumentId:"SI19",
    starInstrument:  "Ice Radar",
    budget:          750,
  },
  {
    id:              "M04",
    label:           "Earth Watcher",
    destination:     "Low Earth Orbit",
    description:     "A quick trip to orbit — monitor Earth from above.",
    difficulty:      "Easy",
    stars:           1,
    distanceKm:      "about 400 km up",
    travelTime:      "about 10 minutes",
    funFact:         "Satellites in low orbit circle Earth about every 90 minutes.",
    distanceRating:  2,
    sunlightPct:     100,
    nightNeed:       20,
    heatDanger:      1,
    radiation:       0,
    launchPull:      0.8,
    signalNeed:      2,
    navigationBrain: 1,
    scienceGoal:     20,
    starInstrumentId:"SI02",
    starInstrument:  "Wide-Angle Camera",
    budget:          120,
  },
  {
    id:              "M05",
    label:           "Sun Watcher",
    destination:     "Close to the Sun",
    description:     "Brave intense heat and radiation to study our star.",
    difficulty:      "Hard",
    stars:           3,
    distanceKm:      "about 150 million km",
    travelTime:      "about 3 years",
    funFact:         "The Sun holds almost all (99.8%) of the mass in our solar system.",
    distanceRating:  25,
    sunlightPct:     300,
    nightNeed:       0,
    heatDanger:      11,
    radiation:       12,
    launchPull:      1.3,
    signalNeed:      3,
    navigationBrain: 15,
    scienceGoal:     75,
    starInstrumentId:"SI12",
    starInstrument:  "Spectrometer",
    budget:          600,
  },
  {
    id:              "M06",
    label:           "Titan Explorer",
    destination:     "Titan (moon of Saturn)",
    description:     "Visit a moon with rivers of liquid methane.",
    difficulty:      "Expert",
    stars:           4,
    distanceKm:      "about 1.4 billion km",
    travelTime:      "about 7 years",
    funFact:         "Titan has rivers and lakes made of liquid methane, not water.",
    distanceRating:  60,
    sunlightPct:     1,
    nightNeed:       0,
    heatDanger:      9,
    radiation:       2,
    launchPull:      1.2,
    signalNeed:      7,
    navigationBrain: 20,
    scienceGoal:     140,
    starInstrumentId:"SI16",
    starInstrument:  "Mini Chemistry Lab",
    budget:          850,
  },
];

/** Look up a full Objective by its id. Returns undefined if not found. */
export function getObjectiveById(id: string): Objective | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}
