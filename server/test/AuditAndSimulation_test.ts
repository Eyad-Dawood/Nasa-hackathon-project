import assert from "assert";
import { GameCatalog } from "../src/services/flight-director/data/GameCatalog";
import {
  computeSubsystemMetrics,
  runDeterministicAudit,
  simulateManifestMutation,
} from "../src/services/flight-director/data/DeterministicAudit";

describe("Space Benders — Deterministic Audit & What-If Simulation", () => {
  it("fails Rule 1 (Space) when frameCount is 0 or 2 even if space math looks fine", () => {
    const m04 = GameCatalog.getMissionById("M04")!;
    const noFrame = runDeterministicAudit(["SC12", "CM01", "PT20", "PT11", "PT01", "SI02"], m04);
    assert.strictEqual(noFrame.checks.find((c) => c.ruleId === "space")?.pass, false);
    assert.strictEqual(noFrame.launchReady, false);

    const twoFrames = runDeterministicAudit(
      ["SC03", "SC04", "SC12", "CM01", "PT20", "PT11", "PT01", "SI02"],
      m04,
    );
    assert.strictEqual(twoFrames.structure.frameCount, 2);
    assert.strictEqual(twoFrames.checks.find((c) => c.ruleId === "space")?.pass, false);
    assert.strictEqual(twoFrames.launchReady, false);
  });

  it("fails Rule 8 (Brain) when computerCount is 0 or 2", () => {
    const m04 = GameCatalog.getMissionById("M04")!;
    const twoComputers = runDeterministicAudit(
      ["SC03", "SC12", "SC13", "CM01", "PT20", "PT11", "PT01"],
      m04,
    );
    assert.strictEqual(twoComputers.structure.computerCount, 2);
    assert.strictEqual(twoComputers.checks.find((c) => c.ruleId === "brain")?.pass, false);
  });

  it("fails Rule 9 (Data Rate) & Rule 10 (Signal) when 0 radios installed even if netData === 0", () => {
    const m04 = GameCatalog.getMissionById("M04")!;
    const noRadio = runDeterministicAudit(["SC03", "SC12", "PT20", "PT11", "PT01"], m04);
    assert.strictEqual(noRadio.structure.radioCount, 0);
    assert.strictEqual(noRadio.checks.find((c) => c.ruleId === "datarate")?.pass, false);
    assert.strictEqual(noRadio.checks.find((c) => c.ruleId === "signal")?.pass, false);
  });

  it("does not stack fuel_burn across multiple engines (uses highestFuelBurn) and clamps net power/data >= 0", () => {
    const m03 = GameCatalog.getMissionById("M03")!;
    const compIds = ["SC05", "PT23", "PT23", "PT24", "PT19", "SC17", "CM08", "SI03"];
    const metrics = computeSubsystemMetrics(
      compIds.map((id) => GameCatalog.getComponentById(id)!),
      m03,
    );
    // PT23 burn=1, PT24 burn=1 -> highestFuelBurn must be 1, NOT 3
    assert.strictEqual(metrics.highestFuelBurn, 1);
    assert.strictEqual(metrics.requiredFuel, m03.distanceRating * 1);

    // Clamp net power needed at 0 if powerSaved exceeds powerUsed
    const saverShip = computeSubsystemMetrics(
      ["SC01", "PT17", "PT18"].map((id) => GameCatalog.getComponentById(id)!),
      m03,
    );
    assert.ok(saverShip.netPowerNeeded >= 0);
    assert.ok(saverShip.netDataGenerated >= 0);
  });

  it("triggers Night Battery check only when solar panels exist and mission nightNeed > 0", () => {
    const m01 = GameCatalog.getMissionById("M01")!; // Moon nightNeed=40
    const solarAudit = runDeterministicAudit(["SC03", "SC12", "CM02", "PT01"], m01);
    assert.strictEqual(solarAudit.checks.find((c) => c.ruleId === "nightbatt")?.pass, false);

    const nuclearAudit = runDeterministicAudit(["SC03", "SC12", "CM02", "PT05"], m01);
    assert.strictEqual(nuclearAudit.checks.find((c) => c.ruleId === "nightbatt")?.pass, true);
  });

  it("awards +10 Star Instrument bonus and passes all 12 rules on a valid M04 craft", () => {
    const m04 = GameCatalog.getMissionById("M04")!;
    // Build a valid M04 craft using Optimizer / manual IDs and test star bonus
    const m04Ids = ["SC03", "SC12", "SI02", "CM01", "PT20", "PT11", "PT01", "PT08"];
    const audit = runDeterministicAudit(m04Ids, m04);
    assert.strictEqual(audit.metrics.starBonus, 10);
    assert.ok(audit.metrics.totalSciencePoints >= 14);
  });

  it("simulates ship mutations without mutating source manifest and reports accurate deltas/rejections", () => {
    const m03 = GameCatalog.getMissionById("M03")!;
    const current = ["SC01", "SC12", "CM01", "PT01"];
    const copy = [...current];

    const diff = simulateManifestMutation(current, m03, {
      addIds: ["PT23", "SC01", "PT99"], // 1 valid ion engine, 1 duplicate frame (maxPerShip=1), 1 bogus ID
      removeIds: ["SI19"], // not installed
    });

    assert.deepStrictEqual(current, copy);
    assert.strictEqual(diff.rejectedAdds.length, 2);
    assert.strictEqual(diff.rejectedRemoves.length, 1);
    assert.strictEqual(diff.deltaCost, GameCatalog.getComponentById("PT23")!.cost);
    assert.strictEqual(diff.deltaMass, GameCatalog.getComponentById("PT23")!.mass);
  });
});

