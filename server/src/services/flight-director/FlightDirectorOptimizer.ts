import {
  ALL_ROLE_IDS,
  CatalogComponent,
  GameCatalog,
  MissionSpec,
  ROLE_LABELS,
  RoleId,
} from "./data/GameCatalog";
import { runDeterministicAudit } from "./data/DeterministicAudit";
import type {
  CandidateBuildPlan,
  OptimizerReport,
  PlanStep,
} from "./types/FlightPlanTypes";

interface RepairOptions {
  mission: MissionSpec;
  initialIds: string[];
  allowSwaps: boolean;
  allowedRoles?: RoleId[];
  objectiveMode: "cost" | "mass" | "balanced";
  powerBias: "auto" | "solar" | "nuclear";
  engineBias: "auto" | "ion" | "rocket";
  seedFrameId?: string;
  seedComputerId?: string;
}

function getStationQuadrant(roleId: RoleId): string {
  return GameCatalog.getStationByRole(roleId)?.quadrant ?? roleId;
}

function countById(ids: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

function canAddComponent(
  ids: readonly string[],
  comp: CatalogComponent,
  allowedRoles?: RoleId[],
): boolean {
  if (allowedRoles && !allowedRoles.includes(comp.roleId)) return false;
  const counts = countById(ids);
  if (comp.maxPerShip !== null && (counts.get(comp.id) ?? 0) >= comp.maxPerShip) {
    return false;
  }
  const comps = ids.map((id) => GameCatalog.getComponentById(id)).filter(Boolean) as CatalogComponent[];
  if (comp.category === "frame" && comps.some((c) => c.category === "frame")) {
    return false;
  }
  if (comp.category === "computer" && comps.some((c) => c.category === "computer")) {
    return false;
  }
  return true;
}

function pickBestCandidate(
  candidates: CatalogComponent[],
  scoreFn: (c: CatalogComponent) => number,
): CatalogComponent | undefined {
  let best: CatalogComponent | undefined;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = scoreFn(c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function explainComponentContribution(comp: CatalogComponent, mission: MissionSpec): string {
  const parts: string[] = [];
  if (comp.frameSpace) parts.push(`provides ${comp.frameSpace} Space`);
  if (comp.spaceBonus) parts.push(`+${comp.spaceBonus} Space`);
  if (comp.brainPower) parts.push(`${comp.brainPower} Brain Power`);
  if (comp.brainBonus) parts.push(`+${comp.brainBonus} Brain`);
  if (comp.thrust) parts.push(`${comp.thrust} Thrust (burn ${comp.fuelBurn ?? 0})`);
  if (comp.fuelCapacity) parts.push(`+${comp.fuelCapacity} Fuel`);
  if (comp.powerMade) {
    parts.push(
      comp.solar
        ? `+${Math.round(comp.powerMade * (mission.sunlightPct / 100) * 10) / 10} Solar Power at ${mission.sunlightPct}% sunlight`
        : `+${comp.powerMade} Nuclear Power`,
    );
  }
  if (comp.powerSaved) parts.push(`saves ${comp.powerSaved} Power`);
  if (comp.batteryStorage) parts.push(`+${comp.batteryStorage} Night Battery`);
  if (comp.heatProtection) parts.push(`+${comp.heatProtection} Heat Protection`);
  if (comp.radiationProtection) parts.push(`+${comp.radiationProtection} Radiation Protection`);
  if (comp.signalRange || comp.dataRate) {
    parts.push(`Range ${comp.signalRange ?? 0}, Data Rate ${comp.dataRate ?? 0}`);
  }
  if (comp.rangeBonus) parts.push(`+${comp.rangeBonus} Signal Range`);
  if (comp.rateBonus) parts.push(`+${comp.rateBonus} Data Rate`);
  if (comp.dataReduction) parts.push(`compresses ${comp.dataReduction} Data`);
  if (comp.launchPullReduction) parts.push(`reduces launch pull by ${comp.launchPullReduction}`);
  if (comp.sciencePoints) {
    const star = comp.id === mission.starInstrumentId ? " (+10 Star Bonus!)" : "";
    parts.push(`+${comp.sciencePoints} Science${star}`);
  }
  return parts.join(", ") || comp.good;
}

function buildStepsDiff(
  initialIds: readonly string[],
  finalIds: readonly string[],
  mission: MissionSpec,
): { steps: PlanStep[]; roleAssignments: Record<RoleId, string[]> } {
  const before = countById(initialIds);
  const after = countById(finalIds);
  const steps: PlanStep[] = [];
  const roleAssignments: Record<RoleId, string[]> = {
    powerAndThermal: [],
    structureAndComputing: [],
    Communications: [],
    Science: [],
  };

  const allIds = new Set([...before.keys(), ...after.keys()]);
  for (const id of allIds) {
    const b = before.get(id) ?? 0;
    const a = after.get(id) ?? 0;
    const comp = GameCatalog.getComponentById(id);
    if (!comp) continue;

    if (a < b) {
      const qty = b - a;
      steps.push({
        action: "remove",
        component: comp,
        quantity: qty,
        stationQuadrant: getStationQuadrant(comp.roleId),
        roleLabel: ROLE_LABELS[comp.roleId],
        reason: `Replace/remove ${comp.name} to satisfy structure, fuel, or budget bounds.`,
      });
      roleAssignments[comp.roleId].push(`Remove ${qty}× ${comp.name} (${comp.id})`);
    } else if (a > b) {
      const qty = a - b;
      const reason = explainComponentContribution(comp, mission);
      steps.push({
        action: "add",
        component: comp,
        quantity: qty,
        stationQuadrant: getStationQuadrant(comp.roleId),
        roleLabel: ROLE_LABELS[comp.roleId],
        reason,
      });
      roleAssignments[comp.roleId].push(
        `Install ${qty}× ${comp.name} (${comp.id}, ${comp.cost} cr, ${comp.mass} kg)`,
      );
    }
  }

  const priorityOrder = (s: PlanStep) => {
    if (s.action === "remove") return 0;
    if (s.component.category === "frame") return 1;
    if (s.component.category === "computer") return 2;
    if (s.component.category === "radio") return 3;
    if (s.component.category === "engine") return 4;
    return 5;
  };
  steps.sort((x, y) => priorityOrder(x) - priorityOrder(y));

  return { steps, roleAssignments };
}

function weightMetric(
  comp: CatalogComponent,
  mode: "cost" | "mass" | "balanced",
  spaceTightness = 0.5,
): number {
  const spaceWeight = spaceTightness > 0.75 ? 4.5 : 1.5;
  if (mode === "cost") return comp.cost + comp.size * spaceWeight + comp.mass * 0.15;
  if (mode === "mass") return comp.mass * 1.5 + comp.size * (spaceWeight + 1) + comp.cost * 0.12;
  return comp.cost * 0.6 + comp.mass * 0.55 + comp.size * spaceWeight;
}

/**
 * Repairs a spacecraft manifest sequentially across coupled subsystems
 * and then trims excess parts or swaps to stay within budget.
 */
function tryRepairManifest(opts: RepairOptions): string[] | null {
  const {
    mission,
    allowSwaps,
    allowedRoles,
    objectiveMode,
    powerBias,
    engineBias,
    seedFrameId,
    seedComputerId,
  } = opts;
  const working = [...opts.initialIds];
  const allComponents = GameCatalog.getAllComponents();

  const isRoleAllowed = (c: CatalogComponent) =>
    !allowedRoles || allowedRoles.includes(c.roleId);

  for (let i = working.length - 1; i >= 0; i--) {
    if (!GameCatalog.getComponentById(working[i])) working.splice(i, 1);
  }

  if (allowSwaps) {
    let seenFrame = false;
    let seenComp = false;
    const seenCounts = new Map<string, number>();
    for (let i = working.length - 1; i >= 0; i--) {
      const c = GameCatalog.getComponentById(working[i])!;
      if (c.category === "frame") {
        if (seenFrame) {
          working.splice(i, 1);
          continue;
        }
        seenFrame = true;
      } else if (c.category === "computer") {
        if (seenComp) {
          working.splice(i, 1);
          continue;
        }
        seenComp = true;
      }
      const nextCount = (seenCounts.get(c.id) ?? 0) + 1;
      if (c.maxPerShip !== null && nextCount > c.maxPerShip) {
        working.splice(i, 1);
      } else {
        seenCounts.set(c.id, nextCount);
      }
    }
  }

  const getComps = () =>
    working.map((id) => GameCatalog.getComponentById(id)!).filter(Boolean);

  // Ensure 1 frame exists
  if (!getComps().some((c) => c.category === "frame")) {
    if (seedFrameId && GameCatalog.getComponentById(seedFrameId)) {
      const sf = GameCatalog.getComponentById(seedFrameId)!;
      if (isRoleAllowed(sf)) working.push(sf.id);
    } else {
      const frames = allComponents.filter((c) => c.category === "frame" && isRoleAllowed(c));
      if (frames.length === 0) return null;
      const targetSpace = mission.scienceGoal >= 100 ? 34 : mission.scienceGoal >= 60 ? 22 : 16;
      const picked =
        frames
          .filter((f) => (f.frameSpace ?? 0) >= targetSpace)
          .sort((a, b) => weightMetric(a, objectiveMode) - weightMetric(b, objectiveMode))[0] ??
        frames.sort((a, b) => (b.frameSpace ?? 0) - (a.frameSpace ?? 0))[0];
      working.push(picked.id);
    }
  }

  // Ensure 1 computer exists
  if (!getComps().some((c) => c.category === "computer")) {
    if (seedComputerId && GameCatalog.getComponentById(seedComputerId)) {
      const sc = GameCatalog.getComponentById(seedComputerId)!;
      if (isRoleAllowed(sc)) working.push(sc.id);
    } else {
      const comps = allComponents.filter((c) => c.category === "computer" && isRoleAllowed(c));
      if (comps.length === 0) return null;
      const picked =
        comps
          .filter((c) => (c.brainPower ?? 0) >= mission.navigationBrain)
          .sort((a, b) => weightMetric(a, objectiveMode) - weightMetric(b, objectiveMode))[0] ??
        comps.sort((a, b) => (b.brainPower ?? 0) - (a.brainPower ?? 0))[0];
      if (picked) working.push(picked.id);
    }
  }

  for (let step = 0; step < 65; step++) {
    const audit = runDeterministicAudit(working, mission);
    if (audit.launchReady) {
      return trimExcessParts(working, mission, allowSwaps);
    }

    const m = audit.metrics;
    const s = audit.structure;
    const spaceTightness = m.availableSpace > 0 ? m.usedSpace / m.availableSpace : 1;

    // 1. Space deficit -> upgrade frame or add SC18 Cargo Bay Extension
    if (m.usedSpace > m.availableSpace) {
      const deficit = m.usedSpace - m.availableSpace;
      if (allowSwaps && s.frameCount === 1) {
        const frameIdx = working.findIndex(
          (id) => GameCatalog.getComponentById(id)?.category === "frame",
        );
        const curFrame = GameCatalog.getComponentById(working[frameIdx])!;
        const largerFrames = allComponents
          .filter(
            (c) =>
              c.category === "frame" &&
              isRoleAllowed(c) &&
              (c.frameSpace ?? 0) > (curFrame.frameSpace ?? 0),
          )
          .sort((a, b) => weightMetric(a, objectiveMode) - weightMetric(b, objectiveMode));
        const fitFrame =
          largerFrames.find((f) => (f.frameSpace ?? 0) - (curFrame.frameSpace ?? 0) >= deficit) ??
          largerFrames[largerFrames.length - 1];
        if (fitFrame) {
          working[frameIdx] = fitFrame.id;
          continue;
        }
      }
      const sc18 = GameCatalog.getComponentById("SC18");
      if (sc18 && canAddComponent(working, sc18, allowedRoles)) {
        working.push(sc18.id);
        continue;
      }
    }

    // 2. Science goal -> star instrument + efficient instruments
    if (m.totalSciencePoints < mission.scienceGoal) {
      const starComp = GameCatalog.getComponentById(mission.starInstrumentId);
      const sciDeficit = mission.scienceGoal - m.totalSciencePoints;
      if (
        starComp &&
        !s.hasStarInstrument &&
        canAddComponent(working, starComp, allowedRoles)
      ) {
        working.push(starComp.id);
        continue;
      }

      const sciPool = allComponents.filter(
        (c) =>
          (c.sciencePoints ?? 0) > 0 &&
          canAddComponent(working, c, allowedRoles),
      );
      const chosenSci = pickBestCandidate(sciPool, (c) => {
        const gain = (c.sciencePoints ?? 0) + (c.id === mission.starInstrumentId && !s.hasStarInstrument ? 10 : 0);
        const usefulGain = Math.min(gain, sciDeficit);
        const overhead =
          weightMetric(c, objectiveMode, spaceTightness) +
          c.size * 3.5 +
          (c.powerUse ?? 0) * 0.7 +
          (c.dataMade ?? 0) * 0.4 +
          (c.brainUse ?? 0) * 0.5;
        return (usefulGain * 14) / Math.max(1, overhead);
      });
      if (chosenSci) {
        working.push(chosenSci.id);
        continue;
      }
    }

    // 3. Signal range & Data rate
    const missingRadio = s.radioCount === 0;
    const signalDeficit = mission.signalNeed - m.totalSignalRange;
    const dataDeficit = m.netDataGenerated - m.effectiveDataRate;

    if (missingRadio || signalDeficit > 0) {
      const radioPool = allComponents.filter(
        (c) => c.category === "radio" && canAddComponent(working, c, allowedRoles),
      );
      const bestRadio = pickBestCandidate(radioPool, (c) => {
        const rangeGain = Math.max(0, (c.signalRange ?? 0) - m.bestSignalRange);
        const meetsAll = (c.signalRange ?? 0) >= mission.signalNeed ? 40 : 0;
        const dataHelp = Math.min(Math.max(15, m.netDataGenerated), c.dataRate ?? 0);
        return (
          meetsAll +
          rangeGain * 12 +
          dataHelp * 1.4 -
          weightMetric(c, objectiveMode, spaceTightness) * 0.85 -
          (c.powerUse ?? 0) * 0.6
        );
      });

      const boosterPool = !missingRadio
        ? allComponents.filter(
            (c) => c.category === "booster" && (c.rangeBonus ?? 0) > 0 && canAddComponent(working, c, allowedRoles),
          )
        : [];
      const bestBooster = pickBestCandidate(boosterPool, (c) => {
        const useful = Math.min(signalDeficit, c.rangeBonus ?? 0);
        return useful * 18 - weightMetric(c, objectiveMode, spaceTightness) - (c.powerUse ?? 0) * 0.7;
      });

      // Allow swapping weak existing radio for long-range radio when allowSwaps=true
      if (allowSwaps && !missingRadio && bestRadio && (bestRadio.signalRange ?? 0) >= mission.signalNeed) {
        const weakRadioIdx = working.findIndex(
          (id) => GameCatalog.getComponentById(id)?.category === "radio" && id !== bestRadio.id,
        );
        if (weakRadioIdx >= 0 && (!bestBooster || (bestBooster.rangeBonus ?? 0) < signalDeficit)) {
          working[weakRadioIdx] = bestRadio.id;
          continue;
        }
      }

      if (bestBooster && (bestBooster.rangeBonus ?? 0) >= signalDeficit && (!bestRadio || bestBooster.cost <= bestRadio.cost)) {
        working.push(bestBooster.id);
        continue;
      }
      if (bestRadio && (missingRadio || (bestRadio.signalRange ?? 0) > m.bestSignalRange)) {
        working.push(bestRadio.id);
        continue;
      }
      if (bestBooster) {
        working.push(bestBooster.id);
        continue;
      }
    }

    if (dataDeficit > 0) {
      const dataFixPool = allComponents.filter(
        (c) =>
          ((c.dataReduction ?? 0) > 0 || (c.rateBonus ?? 0) > 0 || (c.dataRate ?? 0) > 0) &&
          canAddComponent(working, c, allowedRoles),
      );
      const bestDataFix = pickBestCandidate(dataFixPool, (c) => {
        const gain = (c.dataReduction ?? 0) + (c.rateBonus ?? 0) + (c.dataRate ?? 0);
        const useful = Math.min(dataDeficit, gain);
        return (useful * 14) / Math.max(1, weightMetric(c, objectiveMode, spaceTightness) + (c.powerUse ?? 0) * 0.5);
      });
      if (bestDataFix) {
        working.push(bestDataFix.id);
        continue;
      }
    }

    // 4. Radiation & Heat
    if (m.radiationProtection < mission.radiation) {
      const radDeficit = mission.radiation - m.radiationProtection;
      const shields = allComponents.filter(
        (c) => c.category === "shield" && (c.radiationProtection ?? 0) > 0 && canAddComponent(working, c, allowedRoles),
      );
      const chosen = pickBestCandidate(shields, (c) => {
        const gain = Math.min(radDeficit, c.radiationProtection ?? 0);
        const spaceCost = c.size * (spaceTightness > 0.55 ? 8 : 3);
        return (gain * 16) / Math.max(1, c.cost * 0.5 + spaceCost + c.mass * 0.4);
      });
      if (chosen) {
        working.push(chosen.id);
        continue;
      }
    }

    if (m.heatProtection < mission.heatDanger) {
      const heatDeficit = mission.heatDanger - m.heatProtection;
      const insul = allComponents.filter(
        (c) => c.category === "insulation" && (c.heatProtection ?? 0) > 0 && canAddComponent(working, c, allowedRoles),
      );
      const chosen = pickBestCandidate(insul, (c) => {
        const gain = Math.min(heatDeficit, c.heatProtection ?? 0);
        const spaceCost = c.size * (spaceTightness > 0.55 ? 6 : 2.5);
        return (gain * 16) / Math.max(1, c.cost * 0.6 + spaceCost + c.mass * 0.3);
      });
      if (chosen) {
        working.push(chosen.id);
        continue;
      }
    }

    // 5. Brain Power -> upgrade computer to strongest needed, OR add SC20 chips
    if (m.totalBrain < m.requiredBrain) {
      const brainDeficit = m.requiredBrain - m.totalBrain;
      if (allowSwaps && s.computerCount === 1) {
        const compIdx = working.findIndex(
          (id) => GameCatalog.getComponentById(id)?.category === "computer",
        );
        const curComp = GameCatalog.getComponentById(working[compIdx])!;
        const stronger = allComponents
          .filter(
            (c) =>
              c.category === "computer" &&
              isRoleAllowed(c) &&
              (c.brainPower ?? 0) > (curComp.brainPower ?? 0),
          )
          .sort((a, b) => (a.brainPower ?? 0) - (b.brainPower ?? 0));
        const picked =
          stronger.find((c) => (c.brainPower ?? 0) - (curComp.brainPower ?? 0) >= brainDeficit) ??
          stronger[stronger.length - 1];
        if (picked) {
          working[compIdx] = picked.id;
          continue;
        }
      }
      const sc20 = GameCatalog.getComponentById("SC20");
      if (sc20 && canAddComponent(working, sc20, allowedRoles)) {
        working.push(sc20.id);
        continue;
      }
    }

    // 6. Power & Night Batteries
    if (m.effectivePowerMade < m.netPowerNeeded) {
      const pwrDeficit = m.netPowerNeeded - m.effectivePowerMade;
      const sunFactor = mission.sunlightPct / 100;
      const powerPool = allComponents.filter((c) => {
        if (!canAddComponent(working, c, allowedRoles)) return false;
        if (c.category === "solar") return powerBias !== "nuclear";
        if (c.category === "nuclear") return powerBias !== "solar";
        if (c.category === "power_manager") return m.powerUsed > m.powerSaved;
        return false;
      });
      const chosenPower = pickBestCandidate(powerPool, (c) => {
        const effGain = c.powerMade
          ? c.solar
            ? c.powerMade * sunFactor
            : c.powerMade
          : Math.min(c.powerSaved ?? 0, Math.max(0, m.powerUsed - m.powerSaved));
        if (effGain <= 0.1) return -999;
        const batteryOverhead =
          c.solar && !s.hasSolar && mission.nightNeed > 0 ? mission.nightNeed * 0.35 : 0;
        const useful = Math.min(effGain, pwrDeficit);
        return (useful * 14) / Math.max(1, weightMetric(c, objectiveMode, spaceTightness) + batteryOverhead);
      });
      if (chosenPower) {
        working.push(chosenPower.id);
        continue;
      }
    }

    if (s.hasSolar && mission.nightNeed > 0 && m.batteryStorage < mission.nightNeed) {
      const battDeficit = mission.nightNeed - m.batteryStorage;
      const batteries = allComponents.filter(
        (c) => c.category === "battery" && canAddComponent(working, c, allowedRoles),
      );
      const chosen = pickBestCandidate(batteries, (c) => {
        const gain = Math.min(battDeficit, c.batteryStorage ?? 0);
        return (gain * 14) / Math.max(1, weightMetric(c, objectiveMode, spaceTightness));
      });
      if (chosen) {
        working.push(chosen.id);
        continue;
      }
    }

    // 7. Propulsion Thrust & Fuel
    const existingBurnMax = m.highestFuelBurn;
    if (m.totalThrust < m.requiredThrust) {
      const thrustDeficit = m.requiredThrust - m.totalThrust;

      if (allowSwaps && mission.distanceRating >= 25 && existingBurnMax > 1.5 && engineBias !== "rocket") {
        const highBurnIdx = working.findIndex(
          (id) => (GameCatalog.getComponentById(id)?.fuelBurn ?? 0) > 1.5,
        );
        if (highBurnIdx >= 0) {
          const ionChoice = GameCatalog.getComponentById("PT23");
          if (ionChoice) {
            working[highBurnIdx] = ionChoice.id;
            continue;
          }
        }
      }

      const engines = allComponents.filter((c) => {
        if (c.category !== "engine") return false;
        if (!canAddComponent(working, c, allowedRoles)) return false;
        if (engineBias === "ion") return c.id === "PT23" || c.id === "PT24";
        if (engineBias === "rocket") return c.id === "PT20" || c.id === "PT21" || c.id === "PT22";
        return true;
      });

      const chosenEngine = pickBestCandidate(engines, (c) => {
        const newHighestBurn = Math.max(existingBurnMax, c.fuelBurn ?? 0);
        const fuelPenalty =
          newHighestBurn > existingBurnMax
            ? (newHighestBurn - existingBurnMax) * mission.distanceRating * 0.2
            : 0;
        const netThrustGain = (c.thrust ?? 0) - c.mass * m.effectiveLaunchPull;
        if (netThrustGain <= 0) return -999;
        const useful = Math.min(thrustDeficit, netThrustGain);
        return (useful * 12) / Math.max(1, weightMetric(c, objectiveMode, spaceTightness) + fuelPenalty + (c.powerUse ?? 0) * 0.8);
      });

      // Fallback: if chosen thrust-only failed or budget tight, also check SC19 Smooth Nose Cone
      const sc19 = GameCatalog.getComponentById("SC19");
      const noseGain = m.totalMass * 0.1;
      if (
        sc19 &&
        canAddComponent(working, sc19, allowedRoles) &&
        noseGain >= thrustDeficit &&
        (!chosenEngine || sc19.cost < chosenEngine.cost)
      ) {
        working.push(sc19.id);
        continue;
      }

      if (chosenEngine) {
        working.push(chosenEngine.id);
        continue;
      }

      // If engineBias filtered out engines that hit maxPerShip=4, retry unrestricted engine pool
      const fallbackEngines = allComponents.filter(
        (c) => c.category === "engine" && canAddComponent(working, c, allowedRoles),
      );
      const fallbackPick = pickBestCandidate(fallbackEngines, (c) => (c.thrust ?? 0) - c.mass * m.effectiveLaunchPull);
      if (fallbackPick) {
        working.push(fallbackPick.id);
        continue;
      }
    }

    if (m.highestFuelBurn > 0 && m.fuelStored < m.requiredFuel) {
      const fuelDeficit = m.requiredFuel - m.fuelStored;
      const tanks = allComponents.filter(
        (c) => c.category === "fuel_tank" && canAddComponent(working, c, allowedRoles),
      );
      const chosen = pickBestCandidate(tanks, (c) => {
        const gain = Math.min(fuelDeficit, c.fuelCapacity ?? 0);
        return (gain * 14) / Math.max(1, weightMetric(c, objectiveMode, spaceTightness) + c.size * 2.5);
      });
      if (chosen) {
        working.push(chosen.id);
        continue;
      }
    }

    // 8. Budget recovery: all rules 1..11 pass (or stuck over budget) -> trim or downgrade expensive parts!
    if (m.totalCost > mission.budget && allowSwaps) {
      const trimmed = tryReduceCostPreservingRules(working, mission);
      if (trimmed) return trimmed;
    }

    break;
  }

  const finalAudit = runDeterministicAudit(working, mission);
  if (finalAudit.launchReady) {
    return trimExcessParts(working, mission, allowSwaps);
  }
  // One final budget-reduction attempt if rules 1..11 passed and only 12 (budget) failed
  if (
    allowSwaps &&
    finalAudit.failingRuleIds.length === 1 &&
    finalAudit.failingRuleIds[0] === "budget"
  ) {
    const trimmed = tryReduceCostPreservingRules(working, mission);
    if (trimmed && runDeterministicAudit(trimmed, mission).launchReady) {
      return trimmed;
    }
  }
  return null;
}

function passesRules1To11(ids: readonly string[], mission: MissionSpec): boolean {
  const audit = runDeterministicAudit(ids, mission);
  return audit.checks
    .filter((c) => c.ruleId !== "budget")
    .every((c) => c.pass);
}

function tryReduceCostPreservingRules(
  ids: readonly string[],
  mission: MissionSpec,
): string[] | null {
  const working = trimExcessParts(ids, mission, true, true);
  if (runDeterministicAudit(working, mission).launchReady) return working;

  // Try single-item downgrades within the same category
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let i = 0; i < working.length; i++) {
      const cur = GameCatalog.getComponentById(working[i]);
      if (!cur) continue;

      const cheaper = GameCatalog.getAllComponents()
        .filter((c) => c.category === cur.category && c.cost < cur.cost)
        .sort((a, b) => a.cost - b.cost);

      for (const alt of cheaper) {
        if (working.filter((x, idx) => idx !== i && x === alt.id).length >= (alt.maxPerShip ?? 999)) {
          continue;
        }
        const trial = [...working];
        trial[i] = alt.id;
        if (passesRules1To11(trial, mission)) {
          working[i] = alt.id;
          improved = true;
          break;
        }
      }
      if (runDeterministicAudit(working, mission).launchReady) {
        return working;
      }
      if (improved) break;
    }
    if (!improved) break;
  }

  return runDeterministicAudit(working, mission).launchReady ? working : null;
}

function trimExcessParts(
  ids: readonly string[],
  mission: MissionSpec,
  allowRemovingInitial: boolean,
  ignoreBudgetForTrim = false,
): string[] {
  const working = [...ids];
  if (!allowRemovingInitial) return working;

  let improved = true;
  while (improved) {
    improved = false;
    const candidates = working
      .map((id, idx) => ({ id, idx, comp: GameCatalog.getComponentById(id)! }))
      .filter((x) => x.comp && x.comp.category !== "frame" && x.comp.category !== "computer")
      .sort((a, b) => b.comp.cost - a.comp.cost);

    for (const item of candidates) {
      const trial = [...working];
      trial.splice(item.idx, 1);
      const ok = ignoreBudgetForTrim
        ? passesRules1To11(trial, mission)
        : runDeterministicAudit(trial, mission).launchReady;
      if (ok) {
        working.splice(item.idx, 1);
        improved = true;
        break;
      }
    }
  }
  return working;
}

export class FlightDirectorOptimizer {
  findBuildPlans(params: {
    mission: MissionSpec;
    currentItemIds: readonly string[];
    allowedRoles?: RoleId[];
  }): OptimizerReport {
    const { mission, currentItemIds, allowedRoles } = params;
    const currentAudit = runDeterministicAudit(currentItemIds, mission);

    if (currentAudit.launchReady) {
      return {
        missionId: mission.id,
        missionName: mission.name,
        currentLaunchReady: true,
        recommendedPlan: {
          planName: "Current Configuration Already Launch-Ready",
          strategy: "balanced_upgrade",
          feasible: true,
          steps: [],
          finalAudit: currentAudit,
          roleAssignments: {
            powerAndThermal: [],
            structureAndComputing: [],
            Communications: [],
            Science: [],
          },
          tradeOffSummary: `Your spacecraft already passes all 12 rules (${currentAudit.metrics.totalCost}/${mission.budget} cr, ${currentAudit.metrics.totalMass} kg).`,
        },
        alternativePlan: null,
      };
    }

    const candidates: CandidateBuildPlan[] = [];
    const seenSignatures = new Set<string>();

    const strategies: Array<{
      label: string;
      strategy: CandidateBuildPlan["strategy"];
      initial: string[];
      allowSwaps: boolean;
      mode: "cost" | "mass" | "balanced";
      powerBias: "auto" | "solar" | "nuclear";
      engineBias: "auto" | "ion" | "rocket";
      seedFrameId?: string;
      seedComputerId?: string;
    }> = [
      {
        label: "Incremental Team Upgrade (Keep Current Modules)",
        strategy: "balanced_upgrade",
        initial: [...currentItemIds],
        allowSwaps: false,
        mode: "balanced",
        powerBias: mission.sunlightPct <= 25 ? "nuclear" : "auto",
        engineBias: mission.distanceRating >= 20 ? "ion" : "auto",
      },
      {
        label: "Lowest-Cost Repair & Upgrade",
        strategy: "lowest_cost_repair",
        initial: [...currentItemIds],
        allowSwaps: true,
        mode: "cost",
        powerBias: mission.sunlightPct <= 25 ? "nuclear" : "auto",
        engineBias: "auto",
      },
      {
        label: "Lowest-Mass Optimized Architecture",
        strategy: "lowest_mass_repair",
        initial: [...currentItemIds],
        allowSwaps: true,
        mode: "mass",
        powerBias: mission.sunlightPct <= 25 ? "nuclear" : "solar",
        engineBias: "ion",
      },
      {
        label: "Rocket Propulsion Reference Build",
        strategy: "reference_mission_build",
        initial: [],
        allowSwaps: true,
        mode: "cost",
        powerBias: mission.sunlightPct >= 50 ? "solar" : "nuclear",
        engineBias: "rocket",
        seedFrameId: mission.budget >= 500 ? "SC05" : "SC03",
        seedComputerId: mission.navigationBrain >= 15 ? "SC16" : "SC14",
      },
      {
        label: "Nuclear + Ion Clean Architecture",
        strategy: "reference_mission_build",
        initial: [],
        allowSwaps: true,
        mode: "cost",
        powerBias: "nuclear",
        engineBias: "ion",
        seedFrameId: mission.budget >= 500 ? "SC05" : "SC03",
        seedComputerId: mission.navigationBrain >= 15 ? "SC16" : "SC14",
      },
      {
        label: "Spacious Super-Computer Build",
        strategy: "reference_mission_build",
        initial: [],
        allowSwaps: true,
        mode: "cost",
        powerBias: "auto",
        engineBias: "auto",
        seedFrameId: "SC05",
        seedComputerId: "SC17",
      },
    ];

    for (const s of strategies) {
      const activeAllowed = s.initial.length > 0 || !allowedRoles ? allowedRoles : undefined;
      const solved = tryRepairManifest({
        mission,
        initialIds: s.initial,
        allowSwaps: s.allowSwaps,
        allowedRoles: activeAllowed,
        objectiveMode: s.mode,
        powerBias: s.powerBias,
        engineBias: s.engineBias,
        seedFrameId: s.seedFrameId,
        seedComputerId: s.seedComputerId,
      });

      if (!solved) continue;
      const finalAudit = runDeterministicAudit(solved, mission);
      if (!finalAudit.launchReady) continue;

      const sig = [...solved].sort().join(",");
      if (seenSignatures.has(sig)) continue;
      seenSignatures.add(sig);

      const { steps, roleAssignments } = buildStepsDiff(currentItemIds, solved, mission);
      candidates.push({
        planName: s.label,
        strategy: s.strategy,
        feasible: true,
        steps,
        finalAudit,
        roleAssignments,
        tradeOffSummary: `${finalAudit.metrics.totalCost}/${mission.budget} credits (${mission.budget - finalAudit.metrics.totalCost} cr margin), ${finalAudit.metrics.totalMass} kg total mass, ${finalAudit.metrics.usedSpace}/${finalAudit.metrics.availableSpace} Space, ${finalAudit.metrics.totalSciencePoints} Science pts.`,
      });
    }

    candidates.sort((a, b) => {
      const aRemovals = a.steps.filter((s) => s.action === "remove").length;
      const bRemovals = b.steps.filter((s) => s.action === "remove").length;
      if (aRemovals !== bRemovals) return aRemovals - bRemovals;
      const aStepCount = a.steps.reduce((acc, s) => acc + s.quantity, 0);
      const bStepCount = b.steps.reduce((acc, s) => acc + s.quantity, 0);
      if (Math.abs(aStepCount - bStepCount) >= 3) return aStepCount - bStepCount;
      return a.finalAudit.metrics.totalCost - b.finalAudit.metrics.totalCost;
    });

    const recommendedPlan = candidates[0] ?? null;
    const alternativePlan =
      candidates.find((c) => c !== recommendedPlan && c.strategy !== recommendedPlan?.strategy) ??
      candidates[1] ??
      null;

    let roleLimitedNote: string | undefined;
    if (allowedRoles && allowedRoles.length < ALL_ROLE_IDS.length && recommendedPlan) {
      const neededOtherRoles = ALL_ROLE_IDS.filter(
        (r) => !allowedRoles.includes(r) && recommendedPlan.roleAssignments[r].length > 0,
      );
      if (neededOtherRoles.length > 0) {
        roleLimitedNote = `Requires cooperation from ${neededOtherRoles.map((r) => ROLE_LABELS[r]).join(", ")} engineers.`;
      }
    }

    return {
      missionId: mission.id,
      missionName: mission.name,
      currentLaunchReady: false,
      recommendedPlan,
      alternativePlan,
      roleLimitedNote,
    };
  }
}

export const flightDirectorOptimizer = new FlightDirectorOptimizer();
