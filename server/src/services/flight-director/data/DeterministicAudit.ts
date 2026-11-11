import {
  ALL_ROLE_IDS,
  CatalogComponent,
  GameCatalog,
  MissionSpec,
  RoleId,
} from "./GameCatalog";
import type {
  DeterministicAuditReport,
  DeterministicCheckResult,
  ShipStructureStatus,
  ShipSubsystemMetrics,
  SimulationDiff,
  SimulationMutationSpec,
} from "../types/FlightPlanTypes";

function sum<T>(arr: readonly T[], fn: (item: T) => number): number {
  let acc = 0;
  for (const item of arr) acc += fn(item);
  return acc;
}

function max0<T>(arr: readonly T[], fn: (item: T) => number): number {
  if (arr.length === 0) return 0;
  let m = -Infinity;
  for (const item of arr) {
    const v = fn(item);
    if (v > m) m = v;
  }
  return m;
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function resolveComponents(itemIds: readonly string[]): CatalogComponent[] {
  const result: CatalogComponent[] = [];
  for (const id of itemIds) {
    const comp = GameCatalog.getComponentById(id);
    if (comp) result.push(comp);
  }
  return result;
}

export function evaluateStructure(components: readonly CatalogComponent[], mission: MissionSpec | null): ShipStructureStatus {
  const frames = components.filter((c) => c.category === "frame");
  const computers = components.filter((c) => c.category === "computer");
  const radios = components.filter((c) => c.dataRate !== undefined);
  const engines = components.filter((c) => c.thrust !== undefined);
  const hasSolar = components.some((c) => Boolean(c.solar));
  const hasStarInstrument = mission
    ? components.some((c) => c.id === mission.starInstrumentId)
    : false;

  const countMap = new Map<string, { comp: CatalogComponent; count: number }>();
  for (const comp of components) {
    const existing = countMap.get(comp.id);
    if (existing) existing.count += 1;
    else countMap.set(comp.id, { comp, count: 1 });
  }

  const maxPerShipViolations: ShipStructureStatus["maxPerShipViolations"] = [];
  for (const { comp, count } of countMap.values()) {
    if (comp.maxPerShip !== null && count > comp.maxPerShip) {
      maxPerShipViolations.push({
        itemId: comp.id,
        name: comp.name,
        count,
        limit: comp.maxPerShip,
      });
    }
  }

  return {
    frameCount: frames.length,
    computerCount: computers.length,
    radioCount: radios.length,
    engineCount: engines.length,
    hasSolar,
    hasStarInstrument,
    maxPerShipViolations,
    isStructurallyValid:
      frames.length === 1 &&
      computers.length === 1 &&
      radios.length >= 1 &&
      maxPerShipViolations.length === 0,
  };
}

export function computeSubsystemMetrics(
  components: readonly CatalogComponent[],
  mission: MissionSpec | null,
): ShipSubsystemMetrics {
  const frames = components.filter((c) => c.category === "frame");
  const cargoBays = components.filter((c) => c.category === "addon" && c.spaceBonus);
  const frameSpace = sum(frames, (c) => c.frameSpace ?? 0);
  const extraSpace = sum(cargoBays, (c) => c.spaceBonus ?? 0);
  const availableSpace = frameSpace + extraSpace;
  const usedSpace = sum(components, (c) => c.size);

  const totalMass = sum(components, (c) => c.mass);
  const totalCost = sum(components, (c) => c.cost);

  const engines = components.filter((c) => c.thrust !== undefined);
  const noseCone = components.find((c) => c.launchPullReduction !== undefined);
  const totalThrust = sum(engines, (c) => c.thrust ?? 0);
  const basePull = mission?.launchPull ?? 1.0;
  const effectiveLaunchPull = r1(Math.max(0, basePull - (noseCone?.launchPullReduction ?? 0)));
  const requiredThrust = r1(totalMass * effectiveLaunchPull);

  const burnEngines = components.filter((c) => c.fuelBurn !== undefined && (c.fuelBurn ?? 0) > 0);
  const highestFuelBurn = max0(burnEngines, (c) => c.fuelBurn ?? 0);
  const fuelStored = sum(components, (c) => c.fuelCapacity ?? 0);
  const requiredFuel = mission ? r1(mission.distanceRating * highestFuelBurn) : 0;

  const sunlightFactor = (mission?.sunlightPct ?? 100) / 100;
  let powerMade = 0;
  for (const c of components) {
    if (c.powerMade !== undefined) {
      powerMade += c.solar ? c.powerMade * sunlightFactor : c.powerMade;
    }
  }
  const effectivePowerMade = r1(powerMade);
  const powerUsed = sum(components, (c) => c.powerUse ?? 0);
  const powerSaved = sum(components, (c) => c.powerSaved ?? 0);
  const netPowerNeeded = Math.max(0, powerUsed - powerSaved);

  const batteryStorage = sum(components, (c) => c.batteryStorage ?? 0);
  const heatProtection = sum(components, (c) => c.heatProtection ?? 0);
  const radiationProtection = sum(components, (c) => c.radiationProtection ?? 0);

  const brainPower = sum(components, (c) => c.brainPower ?? 0);
  const brainBonus = sum(components, (c) => c.brainBonus ?? 0);
  const totalBrain = brainPower + brainBonus;
  const instrumentBrain = sum(components, (c) => c.brainUse ?? 0);
  const requiredBrain = (mission?.navigationBrain ?? 0) + instrumentBrain;

  const radios = components.filter((c) => c.dataRate !== undefined);
  const totalDataRate = sum(radios, (c) => c.dataRate ?? 0);
  const rateBonus = sum(components, (c) => c.rateBonus ?? 0);
  const effectiveDataRate = totalDataRate + rateBonus;
  const dataMade = sum(components, (c) => c.dataMade ?? 0);
  const dataReduced = sum(components, (c) => c.dataReduction ?? 0);
  const netDataGenerated = Math.max(0, dataMade - dataReduced);

  const bestSignalRange = max0(radios, (c) => c.signalRange ?? 0);
  const rangeBoosters = sum(components, (c) => c.rangeBonus ?? 0);
  const totalSignalRange = bestSignalRange + rangeBoosters;

  const baseSciencePoints = sum(components, (c) => c.sciencePoints ?? 0);
  const starBonus = mission && components.some((c) => c.id === mission.starInstrumentId) ? 10 : 0;
  const totalSciencePoints = baseSciencePoints + starBonus;

  const roleCoverage: Record<RoleId, number> = {
    powerAndThermal: 0,
    structureAndComputing: 0,
    Communications: 0,
    Science: 0,
  };
  for (const role of ALL_ROLE_IDS) {
    roleCoverage[role] = components.filter((c) => c.roleId === role).length;
  }

  return {
    itemCount: components.length,
    totalMass,
    totalCost,
    usedSpace,
    availableSpace,
    totalThrust,
    effectiveLaunchPull,
    requiredThrust,
    fuelStored,
    highestFuelBurn,
    requiredFuel,
    effectivePowerMade,
    powerUsed,
    powerSaved,
    netPowerNeeded,
    batteryStorage,
    heatProtection,
    radiationProtection,
    totalBrain,
    requiredBrain,
    effectiveDataRate,
    netDataGenerated,
    bestSignalRange,
    rangeBoosters,
    totalSignalRange,
    baseSciencePoints,
    starBonus,
    totalSciencePoints,
    roleCoverage,
  };
}

export function runDeterministicAudit(
  itemIds: readonly string[],
  mission: MissionSpec | null,
): DeterministicAuditReport {
  const components = resolveComponents(itemIds);
  const structure = evaluateStructure(components, mission);
  const metrics = computeSubsystemMetrics(components, mission);

  const partCountsById: Record<string, number> = {};
  for (const comp of components) {
    partCountsById[comp.id] = (partCountsById[comp.id] ?? 0) + 1;
  }

  if (!mission) {
    const noObjCheck: DeterministicCheckResult = {
      ruleId: "no_obj",
      ruleNumber: 0,
      label: "No mission selected",
      pass: false,
      actualValue: 0,
      requiredValue: 1,
      comparator: "==",
      actualText: "No mission",
      requiredText: "Select mission M01–M06",
      margin: -1,
      note: "Host must select a destination mission before launch evaluation.",
    };
    return {
      missionId: null,
      missionName: "Unselected Mission",
      destination: "Unselected",
      checks: [noObjCheck],
      passCount: 0,
      failCount: 1,
      launchReady: false,
      failingRuleIds: ["no_obj"],
      structure,
      metrics,
      partCountsById,
    };
  }

  const framesNote =
    structure.frameCount === 0
      ? "Exactly 1 frame is required."
      : structure.frameCount > 1
        ? `Too many frames (${structure.frameCount}); use exactly 1.`
        : undefined;

  const computersNote =
    structure.computerCount === 0
      ? "Exactly 1 computer is required."
      : structure.computerCount > 1
        ? `Too many computers (${structure.computerCount}); use exactly 1.`
        : undefined;

  const checks: DeterministicCheckResult[] = [
    {
      ruleId: "space",
      ruleNumber: 1,
      label: "1 — Space",
      pass: structure.frameCount === 1 && metrics.usedSpace <= metrics.availableSpace,
      actualValue: metrics.usedSpace,
      requiredValue: metrics.availableSpace,
      comparator: "<=",
      actualText: `${metrics.usedSpace} Space used (${structure.frameCount} frame)`,
      requiredText: `1 frame & <= ${metrics.availableSpace} available`,
      margin: metrics.availableSpace - metrics.usedSpace,
      note: framesNote,
    },
    {
      ruleId: "thrust",
      ruleNumber: 2,
      label: "2 — Thrust",
      pass: metrics.totalThrust >= metrics.requiredThrust,
      actualValue: metrics.totalThrust,
      requiredValue: metrics.requiredThrust,
      comparator: ">=",
      actualText: `${metrics.totalThrust} Thrust`,
      requiredText: `>= ${metrics.requiredThrust} (${metrics.totalMass} kg x ${metrics.effectiveLaunchPull} pull)`,
      margin: r1(metrics.totalThrust - metrics.requiredThrust),
    },
    {
      ruleId: "fuel",
      ruleNumber: 3,
      label: "3 — Fuel",
      pass: metrics.highestFuelBurn === 0 || metrics.fuelStored >= metrics.requiredFuel,
      actualValue: metrics.fuelStored,
      requiredValue: metrics.requiredFuel,
      comparator: ">=",
      actualText:
        metrics.highestFuelBurn === 0
          ? "0 fuel needed (no fuel-burning engines)"
          : `${metrics.fuelStored} fuel stored`,
      requiredText:
        metrics.highestFuelBurn === 0
          ? "N/A"
          : `>= ${metrics.requiredFuel} (dist ${mission.distanceRating} x burn ${metrics.highestFuelBurn})`,
      margin:
        metrics.highestFuelBurn === 0
          ? 0
          : r1(metrics.fuelStored - metrics.requiredFuel),
    },
    {
      ruleId: "power",
      ruleNumber: 4,
      label: "4 — Power",
      pass: metrics.effectivePowerMade >= metrics.netPowerNeeded,
      actualValue: metrics.effectivePowerMade,
      requiredValue: metrics.netPowerNeeded,
      comparator: ">=",
      actualText: `${metrics.effectivePowerMade} Power made (at ${mission.sunlightPct}% sunlight)`,
      requiredText: `>= ${metrics.netPowerNeeded} (${metrics.powerUsed} used - ${metrics.powerSaved} saved)`,
      margin: r1(metrics.effectivePowerMade - metrics.netPowerNeeded),
    },
    {
      ruleId: "nightbatt",
      ruleNumber: 5,
      label: "5 — Night Batteries",
      pass: !structure.hasSolar || mission.nightNeed === 0 || metrics.batteryStorage >= mission.nightNeed,
      actualValue: metrics.batteryStorage,
      requiredValue: structure.hasSolar ? mission.nightNeed : 0,
      comparator: ">=",
      actualText: structure.hasSolar ? `${metrics.batteryStorage} Battery Storage` : "No solar panels",
      requiredText: structure.hasSolar && mission.nightNeed > 0 ? `>= ${mission.nightNeed}` : "N/A",
      margin:
        structure.hasSolar && mission.nightNeed > 0
          ? metrics.batteryStorage - mission.nightNeed
          : 0,
    },
    {
      ruleId: "heat",
      ruleNumber: 6,
      label: "6 — Heat",
      pass: metrics.heatProtection >= mission.heatDanger,
      actualValue: metrics.heatProtection,
      requiredValue: mission.heatDanger,
      comparator: ">=",
      actualText: `${metrics.heatProtection} Heat Protection`,
      requiredText: `>= ${mission.heatDanger}`,
      margin: metrics.heatProtection - mission.heatDanger,
    },
    {
      ruleId: "radiation",
      ruleNumber: 7,
      label: "7 — Radiation",
      pass: metrics.radiationProtection >= mission.radiation,
      actualValue: metrics.radiationProtection,
      requiredValue: mission.radiation,
      comparator: ">=",
      actualText: `${metrics.radiationProtection} Radiation Protection`,
      requiredText: `>= ${mission.radiation}`,
      margin: metrics.radiationProtection - mission.radiation,
    },
    {
      ruleId: "brain",
      ruleNumber: 8,
      label: "8 — Brain",
      pass: structure.computerCount === 1 && metrics.totalBrain >= metrics.requiredBrain,
      actualValue: metrics.totalBrain,
      requiredValue: metrics.requiredBrain,
      comparator: ">=",
      actualText: `${metrics.totalBrain} Brain Power (${structure.computerCount} computer)`,
      requiredText: `1 computer & >= ${metrics.requiredBrain}`,
      margin: metrics.totalBrain - metrics.requiredBrain,
      note: computersNote,
    },
    {
      ruleId: "datarate",
      ruleNumber: 9,
      label: "9 — Data Rate",
      pass: structure.radioCount >= 1 && metrics.effectiveDataRate >= metrics.netDataGenerated,
      actualValue: metrics.effectiveDataRate,
      requiredValue: metrics.netDataGenerated,
      comparator: ">=",
      actualText: `${metrics.effectiveDataRate} Data Rate (${structure.radioCount} radio)`,
      requiredText: `>= 1 radio & >= ${metrics.netDataGenerated} (${metrics.netDataGenerated} net)`,
      margin: metrics.effectiveDataRate - metrics.netDataGenerated,
      note: structure.radioCount === 0 ? "At least 1 radio/antenna is required." : undefined,
    },
    {
      ruleId: "signal",
      ruleNumber: 10,
      label: "10 — Signal Range",
      pass: structure.radioCount >= 1 && metrics.totalSignalRange >= mission.signalNeed,
      actualValue: metrics.totalSignalRange,
      requiredValue: mission.signalNeed,
      comparator: ">=",
      actualText: `${metrics.totalSignalRange} Range (${metrics.bestSignalRange} radio + ${metrics.rangeBoosters} boosters)`,
      requiredText: `>= ${mission.signalNeed}`,
      margin: metrics.totalSignalRange - mission.signalNeed,
    },
    {
      ruleId: "science",
      ruleNumber: 11,
      label: "11 — Science",
      pass: metrics.totalSciencePoints >= mission.scienceGoal,
      actualValue: metrics.totalSciencePoints,
      requiredValue: mission.scienceGoal,
      comparator: ">=",
      actualText: `${metrics.totalSciencePoints} Science (${metrics.baseSciencePoints} + ${metrics.starBonus} star)`,
      requiredText: `>= ${mission.scienceGoal}`,
      margin: metrics.totalSciencePoints - mission.scienceGoal,
      note: structure.hasStarInstrument
        ? `Star instrument ${mission.starInstrument} (${mission.starInstrumentId}) installed (+10 bonus).`
        : `Install ${mission.starInstrument} (${mission.starInstrumentId}) for +10 Star Instrument bonus.`,
    },
    {
      ruleId: "budget",
      ruleNumber: 12,
      label: "12 — Budget",
      pass: metrics.totalCost <= mission.budget,
      actualValue: metrics.totalCost,
      requiredValue: mission.budget,
      comparator: "<=",
      actualText: `${metrics.totalCost} credits`,
      requiredText: `<= ${mission.budget} budget`,
      margin: mission.budget - metrics.totalCost,
    },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const failCount = checks.length - passCount;
  const failingRuleIds = checks.filter((c) => !c.pass).map((c) => c.ruleId);

  return {
    missionId: mission.id,
    missionName: mission.name,
    destination: mission.destination,
    checks,
    passCount,
    failCount,
    launchReady: failCount === 0 && structure.isStructurallyValid,
    failingRuleIds,
    structure,
    metrics,
    partCountsById,
  };
}

export function simulateManifestMutation(
  currentItemIds: readonly string[],
  mission: MissionSpec,
  mutation: SimulationMutationSpec,
): SimulationDiff {
  const beforeAudit = runDeterministicAudit(currentItemIds, mission);
  const working = [...currentItemIds];

  const rejectedRemoves: SimulationDiff["rejectedRemoves"] = [];
  for (const removeId of mutation.removeIds) {
    const idx = working.indexOf(removeId);
    if (idx === -1) {
      rejectedRemoves.push({
        itemId: removeId,
        reason: `Component ${removeId} is not currently installed on the ship.`,
      });
    } else {
      working.splice(idx, 1);
    }
  }

  const rejectedAdds: SimulationDiff["rejectedAdds"] = [];
  for (const addId of mutation.addIds) {
    const comp = GameCatalog.getComponentById(addId);
    if (!comp) {
      rejectedAdds.push({
        itemId: addId,
        reason: `Component ID "${addId}" does not exist in game_data.json.`,
      });
      continue;
    }

    const currentCount = working.filter((id) => id === addId).length;
    if (comp.maxPerShip !== null && currentCount >= comp.maxPerShip) {
      rejectedAdds.push({
        itemId: addId,
        reason: `Adding ${comp.name} (${comp.id}) exceeds maxPerShip=${comp.maxPerShip}.`,
      });
      continue;
    }

    working.push(comp.id);
  }

  const afterAudit = runDeterministicAudit(working, mission);
  const beforePassMap = new Map(beforeAudit.checks.map((c) => [c.ruleId, c.pass]));
  const afterPassMap = new Map(afterAudit.checks.map((c) => [c.ruleId, c.pass]));

  const newlyPassingRules: string[] = [];
  const newlyFailingRules: string[] = [];

  for (const [ruleId, afterPass] of afterPassMap.entries()) {
    const beforePass = beforePassMap.get(ruleId);
    if (beforePass === false && afterPass === true) newlyPassingRules.push(ruleId);
    if (beforePass === true && afterPass === false) newlyFailingRules.push(ruleId);
  }

  return {
    beforePassCount: beforeAudit.passCount,
    afterPassCount: afterAudit.passCount,
    newlyPassingRules,
    newlyFailingRules,
    deltaCost: afterAudit.metrics.totalCost - beforeAudit.metrics.totalCost,
    deltaMass: afterAudit.metrics.totalMass - beforeAudit.metrics.totalMass,
    deltaSpaceUsed: afterAudit.metrics.usedSpace - beforeAudit.metrics.usedSpace,
    deltaPowerNet:
      r1(afterAudit.metrics.effectivePowerMade - afterAudit.metrics.netPowerNeeded) -
      r1(beforeAudit.metrics.effectivePowerMade - beforeAudit.metrics.netPowerNeeded),
    deltaScience:
      afterAudit.metrics.totalSciencePoints - beforeAudit.metrics.totalSciencePoints,
    rejectedAdds,
    rejectedRemoves,
    beforeAudit,
    afterAudit,
  };
}

