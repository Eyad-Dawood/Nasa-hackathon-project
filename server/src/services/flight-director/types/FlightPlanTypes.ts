import type { CatalogComponent, RoleId } from "../data/GameCatalog";

export interface DeterministicCheckResult {
  ruleId:
    | "space"
    | "thrust"
    | "fuel"
    | "power"
    | "nightbatt"
    | "heat"
    | "radiation"
    | "brain"
    | "datarate"
    | "signal"
    | "science"
    | "budget"
    | "no_obj";
  ruleNumber: number;
  label: string;
  pass: boolean;
  actualValue: number;
  requiredValue: number;
  comparator: "<=" | ">=" | "==";
  actualText: string;
  requiredText: string;
  margin: number;
  note?: string;
}

export interface ShipStructureStatus {
  frameCount: number;
  computerCount: number;
  radioCount: number;
  engineCount: number;
  hasSolar: boolean;
  hasStarInstrument: boolean;
  maxPerShipViolations: Array<{
    itemId: string;
    name: string;
    count: number;
    limit: number;
  }>;
  isStructurallyValid: boolean;
}

export interface ShipSubsystemMetrics {
  itemCount: number;
  totalMass: number;
  totalCost: number;
  usedSpace: number;
  availableSpace: number;
  totalThrust: number;
  effectiveLaunchPull: number;
  requiredThrust: number;
  fuelStored: number;
  highestFuelBurn: number;
  requiredFuel: number;
  effectivePowerMade: number;
  powerUsed: number;
  powerSaved: number;
  netPowerNeeded: number;
  batteryStorage: number;
  heatProtection: number;
  radiationProtection: number;
  totalBrain: number;
  requiredBrain: number;
  effectiveDataRate: number;
  netDataGenerated: number;
  bestSignalRange: number;
  rangeBoosters: number;
  totalSignalRange: number;
  baseSciencePoints: number;
  starBonus: number;
  totalSciencePoints: number;
  roleCoverage: Record<RoleId, number>;
}

export interface DeterministicAuditReport {
  missionId: string | null;
  missionName: string;
  destination: string;
  checks: DeterministicCheckResult[];
  passCount: number;
  failCount: number;
  launchReady: boolean;
  failingRuleIds: string[];
  structure: ShipStructureStatus;
  metrics: ShipSubsystemMetrics;
  partCountsById: Record<string, number>;
}

export interface SimulationMutationSpec {
  addIds: string[];
  removeIds: string[];
}

export interface SimulationDiff {
  beforePassCount: number;
  afterPassCount: number;
  newlyPassingRules: string[];
  newlyFailingRules: string[];
  deltaCost: number;
  deltaMass: number;
  deltaSpaceUsed: number;
  deltaPowerNet: number;
  deltaScience: number;
  rejectedAdds: Array<{ itemId: string; reason: string }>;
  rejectedRemoves: Array<{ itemId: string; reason: string }>;
  beforeAudit: DeterministicAuditReport;
  afterAudit: DeterministicAuditReport;
}

export interface PlanStep {
  action: "add" | "remove";
  component: CatalogComponent;
  quantity: number;
  stationQuadrant: string;
  roleLabel: string;
  reason: string;
}

export interface CandidateBuildPlan {
  planName: string;
  strategy: "balanced_upgrade" | "lowest_cost_repair" | "lowest_mass_repair" | "reference_mission_build";
  feasible: boolean;
  steps: PlanStep[];
  finalAudit: DeterministicAuditReport;
  roleAssignments: Record<RoleId, string[]>;
  tradeOffSummary: string;
}

export interface OptimizerReport {
  missionId: string;
  missionName: string;
  currentLaunchReady: boolean;
  recommendedPlan: CandidateBuildPlan | null;
  alternativePlan: CandidateBuildPlan | null;
  roleLimitedNote?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  organization: string;
  url: string;
  topics: string[];
  missions: string[];
  summary: string;
  facts: string[];
  ageFriendlyAnalogy: string;
  gameConnection: string;
}

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;
  score: number;
  matchedTerms: string[];
}

