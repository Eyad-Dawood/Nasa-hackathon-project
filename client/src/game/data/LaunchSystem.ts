/**
 * LaunchSystem.ts  —  12-RULE LAUNCH CHECKER
 * ─────────────────────────────────────────────
 * Pure functions — no UI, no Phaser, no side-effects.
 * Runs all 12 mission rules against the ship's current manifest and returns
 * a result object per rule.
 *
 * HOW TO ADD / CHANGE A RULE:
 *   Edit the RULES array.  Each entry has id, label, and a check() function.
 *   LaunchResultUI reads the array automatically.
 *
 * RULE DEFINITIONS (from game_data.json "rules.checks"):
 *   1  Space       — total Size ≤ Frame Space (+ Cargo Bay Extensions)
 *   2  Thrust      — total Thrust ≥ total Mass × (launchPull − noseCone reduction)
 *   3  Fuel        — fuel stored ≥ distanceRating × highest fuelBurn
 *   4  Power       — effectivePowerMade ≥ sum(powerUse) − sum(powerSaved)
 *   5  Night Batt  — if any solar, batteryStorage ≥ nightNeed
 *   6  Heat        — total heatProtection ≥ heatDanger
 *   7  Radiation   — total radiationProtection ≥ radiation
 *   8  Brain       — total brain ≥ navigationBrain + sum(instrument brainUse)
 *   9  Data Rate   — sum(dataRate) + rateBonus ≥ sum(dataMade) − sum(dataReduction)
 *  10  Signal Range — best signalRange + rangeBonus ≥ signalNeed
 *  11  Science     — sciencePoints (+10 star bonus) ≥ scienceGoal
 *  12  Budget      — total cost ≤ budget
 */

import { GameItem } from "./ItemData";
import { Objective } from "./ObjectiveData";

/** Result for a single launch rule check. */
export interface CheckResult {
  /** Short rule identifier (e.g. "space"). */
  ruleId:    string;
  /** Human-readable rule label. */
  label:     string;
  /** Whether the rule passed. */
  pass:      boolean;
  /** Current ship value (shown as "actual"). */
  actual:    string;
  /** Minimum / maximum required (shown as "required"). */
  required:  string;
  /** Optional extra explanation row (shown in grey). */
  note?:     string;
}

/** Full launch result. */
export interface LaunchResult {
  checks:      CheckResult[];
  passCount:   number;
  failCount:   number;
  success:     boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sum<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + fn(x), 0);
}

function max0<T>(arr: T[], fn: (x: T) => number): number {
  if (!arr.length) return 0;
  return Math.max(...arr.map(fn));
}

/** Round to 1 decimal place for display. */
function r1(n: number): number { return Math.round(n * 10) / 10; }

// ── Individual rule checkers ──────────────────────────────────────────────

function checkSpace(items: GameItem[]): CheckResult {
  const frames       = items.filter(i => i.category === "frame");
  const cargoBays    = items.filter(i => i.category === "addon" && i.spaceBonus);
  const frameSpace   = sum(frames,    i => i.frameSpace   ?? 0);
  const extraSpace   = sum(cargoBays, i => i.spaceBonus   ?? 0);
  const totalSpace   = frameSpace + extraSpace;
  const usedSpace    = sum(items, i => i.size);  // frames have size:0

  const pass = frames.length === 1 && usedSpace <= totalSpace;
  let note: string | undefined;
  if (frames.length === 0) {
    note = "⚠ Exactly 1 frame is required on the spacecraft.";
  } else if (frames.length > 1) {
    note = `⚠ Too many frames (${frames.length}) — each spacecraft must use exactly 1 frame.`;
  }

  return {
    ruleId: "space", label: "1 — Space",
    pass,
    actual:   `${usedSpace} Space used (${frames.length} frame)`,
    required: `1 frame & ≤ ${totalSpace} available (${frameSpace} frame + ${extraSpace} cargo)`,
    note,
  };
}

function checkThrust(items: GameItem[], obj: Objective): CheckResult {
  const engines      = items.filter(i => i.thrust !== undefined);
  const noseCone     = items.find(i => i.launchPullReduction !== undefined);
  const totalThrust  = sum(engines, i => i.thrust ?? 0);
  const totalMass    = sum(items,   i => i.mass);
  const effectivePull = Math.max(0, obj.launchPull - (noseCone?.launchPullReduction ?? 0));
  const needed       = r1(totalMass * effectivePull);

  const pass = totalThrust >= needed;
  return {
    ruleId: "thrust", label: "2 — Thrust",
    pass,
    actual:   `${totalThrust} Thrust`,
    required: `≥ ${needed} (${totalMass} kg × ${r1(effectivePull)} pull${noseCone ? ` − ${noseCone.launchPullReduction} nose cone` : ""})`,
  };
}

function checkFuel(items: GameItem[], obj: Objective): CheckResult {
  const engines      = items.filter(i => i.fuelBurn !== undefined && (i.fuelBurn ?? 0) > 0);
  if (engines.length === 0) {
    return {
      ruleId: "fuel", label: "3 — Fuel",
      pass: true,
      actual: "0 fuel (no fuel-burning engines)", required: "N/A",
      note: "Ion / no-burn engines skip this check.",
    };
  }
  const highestBurn  = max0(engines, i => i.fuelBurn ?? 0);
  const fuelNeeded   = obj.distanceRating * highestBurn;
  const fuelStored   = sum(items, i => i.fuelCapacity ?? 0);

  const pass = fuelStored >= fuelNeeded;
  return {
    ruleId: "fuel", label: "3 — Fuel",
    pass,
    actual:   `${fuelStored} fuel stored`,
    required: `≥ ${fuelNeeded} (dist ${obj.distanceRating} × burn ${highestBurn})`,
  };
}

function checkPower(items: GameItem[], obj: Objective): CheckResult {
  let powerMade = 0;
  for (const item of items) {
    if (item.powerMade !== undefined) {
      if (item.solar) {
        powerMade += item.powerMade * (obj.sunlightPct / 100);
      } else {
        powerMade += item.powerMade;
      }
    }
  }
  const powerUsed  = sum(items, i => i.powerUse  ?? 0);
  const powerSaved = sum(items, i => i.powerSaved ?? 0);
  const netNeeded  = Math.max(0, powerUsed - powerSaved);
  const eff        = r1(powerMade);

  const pass = eff >= netNeeded;
  return {
    ruleId: "power", label: "4 — Power",
    pass,
    actual:   `${eff} Power made (at ${obj.sunlightPct}% sunlight)`,
    required: `≥ ${netNeeded} (${powerUsed} used − ${powerSaved} saved)`,
  };
}

function checkNightBatteries(items: GameItem[], obj: Objective): CheckResult {
  const hasSolar = items.some(i => i.solar);
  if (!hasSolar || obj.nightNeed === 0) {
    return {
      ruleId: "nightbatt", label: "5 — Night Batteries",
      pass: true,
      actual: hasSolar ? "Solar present but no night needed" : "No solar panels",
      required: "N/A",
    };
  }
  const storage = sum(items, i => i.batteryStorage ?? 0);
  const pass = storage >= obj.nightNeed;
  return {
    ruleId: "nightbatt", label: "5 — Night Batteries",
    pass,
    actual:   `${storage} Battery Storage`,
    required: `≥ ${obj.nightNeed} (night need)`,
  };
}

function checkHeat(items: GameItem[], obj: Objective): CheckResult {
  const protection = sum(items, i => i.heatProtection ?? 0);
  const pass = protection >= obj.heatDanger;
  return {
    ruleId: "heat", label: "6 — Heat",
    pass,
    actual:   `${protection} Heat Protection`,
    required: `≥ ${obj.heatDanger} (mission heat danger)`,
  };
}

function checkRadiation(items: GameItem[], obj: Objective): CheckResult {
  const protection = sum(items, i => i.radiationProtection ?? 0);
  const pass = protection >= obj.radiation;
  return {
    ruleId: "radiation", label: "7 — Radiation",
    pass,
    actual:   `${protection} Radiation Protection`,
    required: `≥ ${obj.radiation} (mission radiation)`,
    note: protection > 0 && obj.radiation === 0 ? "✓ No radiation at this destination." : undefined,
  };
}

function checkBrain(items: GameItem[], obj: Objective): CheckResult {
  const computers       = items.filter(i => i.category === "computer");
  const brainPower      = sum(items, i => i.brainPower ?? 0);
  const brainBonus      = sum(items, i => i.brainBonus ?? 0);
  const totalBrain      = brainPower + brainBonus;
  const instrumentBrain = sum(items, i => i.brainUse ?? 0);
  const needed          = obj.navigationBrain + instrumentBrain;

  const pass = computers.length === 1 && totalBrain >= needed;
  let note: string | undefined;
  if (computers.length === 0) {
    note = "⚠ Exactly 1 flight computer is required on the spacecraft.";
  } else if (computers.length > 1) {
    note = `⚠ Too many computers (${computers.length}) — each spacecraft may have only 1 computer.`;
  }

  return {
    ruleId: "brain", label: "8 — Brain",
    pass,
    actual:   `${totalBrain} Brain Power (${computers.length} computer, ${brainBonus} chips)`,
    required: `1 computer & ≥ ${needed} (${obj.navigationBrain} nav + ${instrumentBrain} instruments)`,
    note,
  };
}

function checkDataRate(items: GameItem[]): CheckResult {
  const radios       = items.filter(i => i.dataRate !== undefined);
  const totalRate    = sum(radios, i => i.dataRate  ?? 0);
  const rateBonus    = sum(items,  i => i.rateBonus ?? 0);
  const dataMade     = sum(items,  i => i.dataMade  ?? 0);
  const dataReduced  = sum(items,  i => i.dataReduction ?? 0);
  const effectiveRate = totalRate + rateBonus;
  const netData      = Math.max(0, dataMade - dataReduced);

  const pass = radios.length >= 1 && effectiveRate >= netData;
  return {
    ruleId: "datarate", label: "9 — Data Rate",
    pass,
    actual:   `${effectiveRate} Data Rate (${radios.length} radio${radios.length === 1 ? "" : "s"}, ${totalRate} + ${rateBonus} bonus)`,
    required: `≥ 1 radio & ≥ ${netData} (${dataMade} data made − ${dataReduced} compressed)`,
    note: radios.length === 0 ? "⚠ At least 1 radio/antenna is required on the spacecraft." : undefined,
  };
}

function checkSignalRange(items: GameItem[], obj: Objective): CheckResult {
  const radios      = items.filter(i => i.signalRange !== undefined);
  const bestRange   = max0(radios, i => i.signalRange ?? 0);
  const totalBoost  = sum(items, i => i.rangeBonus ?? 0);
  const totalRange  = bestRange + totalBoost;

  const pass = radios.length >= 1 && totalRange >= obj.signalNeed;
  return {
    ruleId: "signal", label: "10 — Signal Range",
    pass,
    actual:   `${totalRange} Range (${bestRange} best radio + ${totalBoost} boosters)`,
    required: `≥ 1 radio & ≥ ${obj.signalNeed} (mission signal need)`,
    note: radios.length === 0 ? "⚠ At least 1 radio/antenna is required to transmit a signal." : undefined,
  };
}

function checkScience(items: GameItem[], obj: Objective): CheckResult {
  const baseScience   = sum(items, i => i.sciencePoints ?? 0);
  const hasStarInstr  = items.some(i => i.id === obj.starInstrumentId);
  const starBonus     = hasStarInstr ? 10 : 0;
  const totalScience  = baseScience + starBonus;

  const pass = totalScience >= obj.scienceGoal;
  return {
    ruleId: "science", label: "11 — Science",
    pass,
    actual:   `${totalScience} Science Points (${baseScience} + ${starBonus} star bonus)`,
    required: `≥ ${obj.scienceGoal} (mission goal)`,
    note: hasStarInstr
      ? `⭐ Star instrument "${obj.starInstrument}" is on board (+10)!`
      : `Tip: add "${obj.starInstrument}" for +10 bonus.`,
  };
}

function checkBudget(items: GameItem[], obj: Objective): CheckResult {
  const totalCost = sum(items, i => i.cost);
  const pass = totalCost <= obj.budget;
  return {
    ruleId: "budget", label: "12 — Budget",
    pass,
    actual:   `${totalCost} credits spent`,
    required: `≤ ${obj.budget} budget`,
  };
}

// ── Main exported function ────────────────────────────────────────────────

export interface ShipStructureValidation {
  frameCount: number;
  computerCount: number;
  radioCount: number;
  maxPerShipViolations: Array<{ itemId: string; name: string; count: number; limit: number }>;
  isValid: boolean;
}

export function validateShipStructure(items: GameItem[]): ShipStructureValidation {
  const frameCount = items.filter((i) => i.category === "frame").length;
  const computerCount = items.filter((i) => i.category === "computer").length;
  const radioCount = items.filter((i) => i.dataRate !== undefined).length;

  const counts = new Map<string, { item: GameItem; count: number }>();
  for (const item of items) {
    const prev = counts.get(item.id);
    if (prev) prev.count += 1;
    else counts.set(item.id, { item, count: 1 });
  }

  const maxPerShipViolations: ShipStructureValidation["maxPerShipViolations"] = [];
  for (const { item, count } of counts.values()) {
    if (item.maxPerShip !== null && count > item.maxPerShip) {
      maxPerShipViolations.push({
        itemId: item.id,
        name: item.name,
        count,
        limit: item.maxPerShip,
      });
    }
  }

  return {
    frameCount,
    computerCount,
    radioCount,
    maxPerShipViolations,
    isValid:
      frameCount === 1 &&
      computerCount === 1 &&
      radioCount >= 1 &&
      maxPerShipViolations.length === 0,
  };
}

/**
 * Run all 12 launch rule checks.
 *
 * @param items     Full GameItem objects currently on the ship.
 * @param objective The selected mission. If null, all checks are skipped/NA.
 */
export function runLaunchChecks(
  items:     GameItem[],
  objective: Objective | null,
): LaunchResult {
  if (!objective) {
    const naCheck: CheckResult = {
      ruleId: "no_obj", label: "No objective selected",
      pass: false,
      actual: "—", required: "Host must select an objective first.",
    };
    return { checks: [naCheck], passCount: 0, failCount: 1, success: false };
  }

  const checks: CheckResult[] = [
    checkSpace(items),
    checkThrust(items, objective),
    checkFuel(items, objective),
    checkPower(items, objective),
    checkNightBatteries(items, objective),
    checkHeat(items, objective),
    checkRadiation(items, objective),
    checkBrain(items, objective),
    checkDataRate(items),
    checkSignalRange(items, objective),
    checkScience(items, objective),
    checkBudget(items, objective),
  ];

  const passCount = checks.filter(c => c.pass).length;
  const failCount = checks.length - passCount;
  return { checks, passCount, failCount, success: failCount === 0 };
}
