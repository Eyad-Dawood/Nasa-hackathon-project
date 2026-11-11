import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type RoleId =
  | "powerAndThermal"
  | "structureAndComputing"
  | "Communications"
  | "Science";

export type DepartmentId =
  | "power_thermal"
  | "structure_computing"
  | "communications"
  | "science";

export interface MissionSpec {
  id: string;
  name: string;
  destination: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  stars: number;
  distanceKm: string;
  distanceRating: number;
  travelTimeStory: string;
  sunlightPct: number;
  nightNeed: number;
  heatDanger: number;
  radiation: number;
  launchPull: number;
  signalNeed: number;
  navigationBrain: number;
  scienceGoal: number;
  budget: number;
  starInstrumentId: string;
  starInstrument: string;
  funFact: string;
}

export interface CatalogComponent {
  id: string;
  name: string;
  department: DepartmentId;
  roleId: RoleId;
  category: string;
  mass: number;
  size: number;
  cost: number;
  maxPerShip: number | null;
  good: string;
  watchOut: string;
  powerMade?: number;
  solar?: boolean;
  powerUse?: number;
  powerSaved?: number;
  batteryStorage?: number;
  heatProtection?: number;
  fuelCapacity?: number;
  thrust?: number;
  fuelBurn?: number;
  frameSpace?: number;
  spaceBonus?: number;
  radiationProtection?: number;
  brainPower?: number;
  brainBonus?: number;
  launchPullReduction?: number;
  dataRate?: number;
  signalRange?: number;
  rangeBonus?: number;
  rateBonus?: number;
  dataReduction?: number;
  dataMade?: number;
  brainUse?: number;
  sciencePoints?: number;
}

export interface StationMeta {
  id: string;
  roleId: RoleId;
  department: DepartmentId;
  roleLabel: string;
  quadrant: string;
  tileCol: number;
  tileRow: number;
}

export const ALL_ROLE_IDS: readonly RoleId[] = [
  "powerAndThermal",
  "structureAndComputing",
  "Communications",
  "Science",
] as const;

export const DEPARTMENT_TO_ROLE: Record<DepartmentId, RoleId> = {
  power_thermal: "powerAndThermal",
  structure_computing: "structureAndComputing",
  communications: "Communications",
  science: "Science",
};

export const ROLE_TO_DEPARTMENT: Record<RoleId, DepartmentId> = {
  powerAndThermal: "power_thermal",
  structureAndComputing: "structure_computing",
  Communications: "communications",
  Science: "science",
};

export const ROLE_LABELS: Record<RoleId, string> = {
  powerAndThermal: "Power & Thermal",
  structureAndComputing: "Structure & Computing",
  Communications: "Communications",
  Science: "Science",
};

export const STATIONS_META: readonly StationMeta[] = [
  {
    id: "station_r1",
    roleId: "powerAndThermal",
    department: "power_thermal",
    roleLabel: "Power & Thermal",
    quadrant: "North-West (top-left, tile 2,2)",
    tileCol: 2,
    tileRow: 2,
  },
  {
    id: "station_r2",
    roleId: "structureAndComputing",
    department: "structure_computing",
    roleLabel: "Structure & Computing",
    quadrant: "North-East (top-right, tile 17,2)",
    tileCol: 17,
    tileRow: 2,
  },
  {
    id: "station_r3",
    roleId: "Communications",
    department: "communications",
    roleLabel: "Communications",
    quadrant: "South-West (bottom-left, tile 2,12)",
    tileCol: 2,
    tileRow: 12,
  },
  {
    id: "station_r4",
    roleId: "Science",
    department: "science",
    roleLabel: "Science",
    quadrant: "South-East (bottom-right, tile 17,12)",
    tileCol: 17,
    tileRow: 12,
  },
] as const;

interface RawGameData {
  meta: {
    game: string;
    audience: string;
    version: string;
    departments: Record<string, string>;
  };
  rules: {
    checks: string[];
    notes: string[];
  };
  missions: Array<Record<string, unknown>>;
  components: Array<Record<string, unknown>>;
}

function resolveGameDataPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  const candidates = [
    path.resolve(currentDir, "../../../../../game_data.json"),
    path.resolve(currentDir, "../../../../../../game_data.json"),
    path.resolve(process.cwd(), "game_data.json"),
    path.resolve(process.cwd(), "../game_data.json"),
    path.resolve(process.cwd(), "../../game_data.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `[GameCatalog] Unable to locate game_data.json. Checked: ${candidates.join(", ")}`,
  );
}

function mapMission(raw: Record<string, unknown>): MissionSpec {
  return {
    id: String(raw.id),
    name: String(raw.name),
    destination: String(raw.destination),
    difficulty: String(raw.difficulty) as MissionSpec["difficulty"],
    stars: Number(raw.stars),
    distanceKm: String(raw.distance_km),
    distanceRating: Number(raw.distance_rating),
    travelTimeStory: String(raw.travel_time_story),
    sunlightPct: Number(raw.sunlight_pct),
    nightNeed: Number(raw.night_need),
    heatDanger: Number(raw.heat_danger),
    radiation: Number(raw.radiation),
    launchPull: Number(raw.launch_pull),
    signalNeed: Number(raw.signal_need),
    navigationBrain: Number(raw.navigation_brain),
    scienceGoal: Number(raw.science_goal),
    budget: Number(raw.budget),
    starInstrumentId: String(raw.star_instrument_id),
    starInstrument: String(raw.star_instrument),
    funFact: String(raw.fun_fact),
  };
}

function numOpt(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined;
}

function mapComponent(raw: Record<string, unknown>): CatalogComponent {
  const dept = String(raw.department) as DepartmentId;
  const roleId = DEPARTMENT_TO_ROLE[dept];
  if (!roleId) {
    throw new Error(`[GameCatalog] Unknown department "${dept}" on component "${raw.id}"`);
  }

  return {
    id: String(raw.id),
    name: String(raw.name),
    department: dept,
    roleId,
    category: String(raw.category),
    mass: Number(raw.mass),
    size: Number(raw.size),
    cost: Number(raw.cost),
    maxPerShip: raw.max_per_ship === null || raw.max_per_ship === undefined
      ? null
      : Number(raw.max_per_ship),
    good: String(raw.good ?? ""),
    watchOut: String(raw.watch_out ?? ""),
    powerMade: numOpt(raw.power_made),
    solar: typeof raw.solar === "boolean" ? raw.solar : undefined,
    powerUse: numOpt(raw.power_use),
    powerSaved: numOpt(raw.power_saved),
    batteryStorage: numOpt(raw.battery_storage),
    heatProtection: numOpt(raw.heat_protection),
    fuelCapacity: numOpt(raw.fuel_capacity),
    thrust: numOpt(raw.thrust),
    fuelBurn: numOpt(raw.fuel_burn),
    frameSpace: numOpt(raw.frame_space),
    spaceBonus: numOpt(raw.space_bonus),
    radiationProtection: numOpt(raw.radiation_protection),
    brainPower: numOpt(raw.brain_power),
    brainBonus: numOpt(raw.brain_bonus),
    launchPullReduction: numOpt(raw.launch_pull_reduction),
    dataRate: numOpt(raw.data_rate),
    signalRange: numOpt(raw.signal_range),
    rangeBonus: numOpt(raw.range_bonus),
    rateBonus: numOpt(raw.rate_bonus),
    dataReduction: numOpt(raw.data_reduction),
    dataMade: numOpt(raw.data_made),
    brainUse: numOpt(raw.brain_use),
    sciencePoints: numOpt(raw.science),
  };
}

class _GameCatalog {
  readonly gameDataPath: string;
  readonly rulesChecks: readonly string[];
  readonly rulesNotes: readonly string[];
  readonly missions: readonly MissionSpec[];
  readonly components: readonly CatalogComponent[];

  private missionMap = new Map<string, MissionSpec>();
  private componentMap = new Map<string, CatalogComponent>();

  constructor() {
    this.gameDataPath = resolveGameDataPath();
    const rawText = fs.readFileSync(this.gameDataPath, "utf-8");
    const parsed = JSON.parse(rawText) as RawGameData;

    this.rulesChecks = Object.freeze([...(parsed.rules?.checks ?? [])]);
    this.rulesNotes = Object.freeze([...(parsed.rules?.notes ?? [])]);

    const missions = (parsed.missions ?? []).map(mapMission);
    const components = (parsed.components ?? []).map(mapComponent);

    this.missions = Object.freeze(missions);
    this.components = Object.freeze(components);

    for (const m of missions) this.missionMap.set(m.id, m);
    for (const c of components) this.componentMap.set(c.id, c);
  }

  isValidRoleId(roleId: string): roleId is RoleId {
    return (ALL_ROLE_IDS as readonly string[]).includes(roleId);
  }

  getMissionById(id: string): MissionSpec | undefined {
    return this.missionMap.get(id);
  }

  getAllMissions(): readonly MissionSpec[] {
    return this.missions;
  }

  getComponentById(id: string): CatalogComponent | undefined {
    return this.componentMap.get(id);
  }

  getAllComponents(): readonly CatalogComponent[] {
    return this.components;
  }

  getComponentsByRole(roleId: RoleId): CatalogComponent[] {
    return this.components.filter((c) => c.roleId === roleId);
  }

  getComponentsByCategory(category: string): CatalogComponent[] {
    return this.components.filter((c) => c.category === category);
  }

  getStationByRole(roleId: RoleId): StationMeta | undefined {
    return STATIONS_META.find((s) => s.roleId === roleId);
  }
}

export const GameCatalog = new _GameCatalog();

