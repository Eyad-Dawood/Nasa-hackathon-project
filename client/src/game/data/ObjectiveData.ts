/**
 * ObjectiveData.ts
 * ────────────────
 * Master registry for authentic NASA Mission Directives.
 * Pure data module.
 *
 * Each objective defines:
 *   - Mission destination and payload envelope limits (maxWeight).
 *   - Critical subsystems needed for orbital insertion / landing.
 *   - Detailed engineering requirements used by the AI Flight Director.
 */

export interface Objective {
  /** Unique identifier — synced via Colyseus GameState.selectedObjectiveId. */
  id: string;

  /** Formal mission designation. */
  label: string;

  /** Target celestial body or orbit. */
  target: string;

  /** Maximum payload mass allowance in kg. */
  maxWeight: number;

  /** Operational difficulty profile. */
  difficulty: "Nominal" | "Challenging" | "Extreme";

  /** Mission briefing description. */
  description: string;

  /** Primary hardware components critical to mission survival. */
  criticalItemIds: string[];

  /** Subsystems that must be represented in the final manifest. */
  requiredRoles: string[];
}

/**
 * Authentic NASA Mission Directives.
 */
export const OBJECTIVES: Objective[] = [
  {
    id: "artemis_lunar_relay",
    label: "Artemis Lunar Gateway Relay",
    target: "Lunar Near-Rectilinear Orbit",
    maxWeight: 190,
    difficulty: "Nominal",
    description: "Deploy a high-frequency communications and telemetry relay satellite to support crewed Artemis surface expeditions at the Lunar South Pole.",
    criticalItemIds: ["engine_core", "comms_array", "nav_system", "solar_cell"],
    requiredRoles: ["powerAndThermal", "structureAndComputing", "Communications"],
  },
  {
    id: "europa_clipper_probe",
    label: "Europa Clipper Deep Ocean Probe",
    target: "Jupiter / Jovian System",
    maxWeight: 240,
    difficulty: "Extreme",
    description: "Launch an radiation-hardened exploration probe through Jupiter's extreme radiation belts to investigate the subsurface ocean of ice-moon Europa.",
    criticalItemIds: ["engine_core", "shield_gen", "radar_dish", "targeting_sys"],
    requiredRoles: ["powerAndThermal", "structureAndComputing", "Communications", "Science"],
  },
  {
    id: "mars_sample_return",
    label: "Mars Sample Return Fetcher",
    target: "Mars Jezero Crater",
    maxWeight: 215,
    difficulty: "Challenging",
    description: "Assemble an autonomous recovery vehicle to retrieve sealed geological sample tubes and launch them into Mars orbit for Earth transit.",
    criticalItemIds: ["fuel_cell", "thruster", "nav_system", "laser_cannon"],
    requiredRoles: ["powerAndThermal", "structureAndComputing", "Science"],
  },
];

/**
 * Look up a full Objective by its id.
 * Falls back to first objective if not found.
 */
export function getObjectiveById(id: string): Objective | undefined {
  return OBJECTIVES.find((o) => o.id === id) ?? OBJECTIVES[0];
}
