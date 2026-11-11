import assert from "assert";
import { GameCatalog } from "../src/services/flight-director/data/GameCatalog";
import { runDeterministicAudit } from "../src/services/flight-director/data/DeterministicAudit";
import { FlightDirectorOptimizer } from "../src/services/flight-director/FlightDirectorOptimizer";

describe("Space Benders — Flight Director Constraint Optimizer", () => {
  const optimizer = new FlightDirectorOptimizer();

  it("generates a 12/12 budget-feasible spacecraft plan from empty ship for all 6 missions (M01–M06)", () => {
    for (const mission of GameCatalog.getAllMissions()) {
      const report = optimizer.findBuildPlans({
        mission,
        currentItemIds: [],
      });

      assert.ok(report.recommendedPlan, `No plan produced for ${mission.id}`);
      assert.strictEqual(
        report.recommendedPlan!.feasible,
        true,
        `Plan for ${mission.id} (${mission.name}) was not feasible`,
      );
      assert.strictEqual(
        report.recommendedPlan!.finalAudit.launchReady,
        true,
        `Plan for ${mission.id} did not pass 12/12 rules`,
      );
      assert.strictEqual(report.recommendedPlan!.finalAudit.passCount, 12);
      assert.ok(
        report.recommendedPlan!.finalAudit.metrics.totalCost <= mission.budget,
        `${mission.id} exceeded budget: ${report.recommendedPlan!.finalAudit.metrics.totalCost} > ${mission.budget}`,
      );
    }
  });

  it("repairs a broken partial M03 Europa ship carrying solar + heavy fuel-burn rocket into a budget-valid 12/12 build", () => {
    const m03 = GameCatalog.getMissionById("M03")!;
    const brokenEuropa = ["SC01", "SC12", "PT01", "PT21", "CM01"];
    const initialAudit = runDeterministicAudit(brokenEuropa, m03);
    assert.strictEqual(initialAudit.launchReady, false);

    const report = optimizer.findBuildPlans({
      mission: m03,
      currentItemIds: brokenEuropa,
    });

    assert.ok(report.recommendedPlan);
    assert.strictEqual(report.recommendedPlan!.feasible, true);
    assert.strictEqual(report.recommendedPlan!.finalAudit.launchReady, true);
    assert.ok(report.recommendedPlan!.finalAudit.metrics.totalCost <= m03.budget);
  });

  it("handles extreme thermal/radiation M05 Sun Watcher and dark M06 Titan missions under budget", () => {
    const m05 = GameCatalog.getMissionById("M05")!;
    const m05Report = optimizer.findBuildPlans({
      mission: m05,
      currentItemIds: ["SC03", "PT01"],
    });
    assert.strictEqual(m05Report.recommendedPlan?.finalAudit.launchReady, true);
    assert.ok((m05Report.recommendedPlan?.finalAudit.metrics.heatProtection ?? 0) >= m05.heatDanger);
    assert.ok((m05Report.recommendedPlan?.finalAudit.metrics.radiationProtection ?? 0) >= m05.radiation);

    const m06 = GameCatalog.getMissionById("M06")!;
    const m06Report = optimizer.findBuildPlans({
      mission: m06,
      currentItemIds: ["SC02", "SI16"],
    });
    assert.strictEqual(m06Report.recommendedPlan?.finalAudit.launchReady, true);
    assert.ok((m06Report.recommendedPlan?.finalAudit.metrics.totalCost ?? 9999) <= m06.budget);
  });

  it("returns zero steps and currentLaunchReady=true when spacecraft already passes 12/12", () => {
    const m01 = GameCatalog.getMissionById("M01")!;
    const seed = optimizer.findBuildPlans({ mission: m01, currentItemIds: [] });
    const builtIds = seed.recommendedPlan!.steps.flatMap((s) =>
      s.action === "add" ? Array(s.quantity).fill(s.component.id) : [],
    );

    const recheck = optimizer.findBuildPlans({
      mission: m01,
      currentItemIds: builtIds,
    });

    assert.strictEqual(recheck.currentLaunchReady, true);
    assert.strictEqual(recheck.recommendedPlan?.steps.length, 0);
    assert.strictEqual(recheck.recommendedPlan?.finalAudit.passCount, 12);
  });
});

