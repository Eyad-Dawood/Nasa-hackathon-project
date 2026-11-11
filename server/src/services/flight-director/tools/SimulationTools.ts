import { z } from "zod";
import { GameCatalog } from "../data/GameCatalog";
import { simulateManifestMutation } from "../data/DeterministicAudit";
import { FlightDirectorOptimizer } from "../FlightDirectorOptimizer";
import type { RegisteredTool } from "./MissionTools";

const optimizer = new FlightDirectorOptimizer();

export const simulateShipChangesTool: RegisteredTool = {
  schemaDef: {
    name: "simulate_ship_changes",
    description:
      "Simulate adding and/or removing component IDs on top of the current Colyseus spacecraft without modifying the real ship, returning before/after 12-rule pass counts and exact deltas.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        addIds: {
          type: "array",
          items: { type: "string" },
          description: "Component IDs to hypothetically install (e.g. ['PT23', 'PT11']).",
        },
        removeIds: {
          type: "array",
          items: { type: "string" },
          description: "Component IDs to hypothetically remove from the current ship.",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      addIds: z.array(z.string().trim().min(2).max(10)).max(12).optional(),
      removeIds: z.array(z.string().trim().min(2).max(10)).max(12).optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const gc = ctx.gameContext;
    if (!gc.mission) {
      return {
        ok: false,
        error: "Cannot run what-if simulation without an active mission.",
      };
    }

    const addIds = Array.isArray(args.addIds)
      ? (args.addIds as string[]).map((id) => id.toUpperCase())
      : [];
    const removeIds = Array.isArray(args.removeIds)
      ? (args.removeIds as string[]).map((id) => id.toUpperCase())
      : [];

    const currentIds = gc.shipManifest.map((i) => i.itemId);
    const diff = simulateManifestMutation(currentIds, gc.mission, { addIds, removeIds });

    return {
      ok: true,
      missionId: gc.mission.id,
      simulatedAdds: addIds.map((id) => ({
        id,
        name: GameCatalog.getComponentById(id)?.name ?? "Unknown",
      })),
      simulatedRemoves: removeIds,
      beforePassCount: diff.beforePassCount,
      afterPassCount: diff.afterPassCount,
      afterLaunchReady: diff.afterAudit.launchReady,
      newlyPassingRules: diff.newlyPassingRules,
      newlyFailingRules: diff.newlyFailingRules,
      stillFailingRules: diff.afterAudit.failingRuleIds,
      deltas: {
        cost: diff.deltaCost,
        mass: diff.deltaMass,
        spaceUsed: diff.deltaSpaceUsed,
        powerNet: diff.deltaPowerNet,
        science: diff.deltaScience,
      },
      afterTotals: {
        cost: diff.afterAudit.metrics.totalCost,
        budget: gc.mission.budget,
        mass: diff.afterAudit.metrics.totalMass,
        usedSpace: diff.afterAudit.metrics.usedSpace,
        availableSpace: diff.afterAudit.metrics.availableSpace,
        requiredThrust: diff.afterAudit.metrics.requiredThrust,
        totalThrust: diff.afterAudit.metrics.totalThrust,
        requiredFuel: diff.afterAudit.metrics.requiredFuel,
        fuelStored: diff.afterAudit.metrics.fuelStored,
      },
      rejectedAdds: diff.rejectedAdds,
      rejectedRemoves: diff.rejectedRemoves,
    };
  },
};

export const findFeasibleBuildPlanTool: RegisteredTool = {
  schemaDef: {
    name: "find_feasible_build_plan",
    description:
      "Compute a verified 12/12 passing spacecraft upgrade or rebuild plan within budget and space constraints for the active mission, plus an alternative architecture trade-off.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        objective: {
          type: "string",
          enum: ["balanced", "lowest_cost", "lowest_mass"],
          description: "Optimization priority (default 'balanced').",
        },
        respectCurrentPlayerRoleOnly: {
          type: "boolean",
          description: "Optional: test if a solution exists using only the requesting player's roles.",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      objective: z.enum(["balanced", "lowest_cost", "lowest_mass"]).optional(),
      respectCurrentPlayerRoleOnly: z.boolean().optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const gc = ctx.gameContext;
    if (!gc.mission) {
      return {
        ok: false,
        error: "Cannot compute a feasible build plan until a mission (M01–M06) is selected.",
      };
    }

    const currentIds = gc.shipManifest.map((i) => i.itemId);
    const allowedRoles = args.respectCurrentPlayerRoleOnly
      ? gc.requestingPlayer.roles
      : undefined;

    const report = optimizer.findBuildPlans({
      mission: gc.mission,
      currentItemIds: currentIds,
      allowedRoles,
    });

    const preferredObjective = args.objective as "balanced" | "lowest_cost" | "lowest_mass" | undefined;
    let primary = report.recommendedPlan;
    let alt = report.alternativePlan;

    if (
      preferredObjective === "lowest_cost" &&
      alt &&
      primary &&
      alt.finalAudit.metrics.totalCost < primary.finalAudit.metrics.totalCost
    ) {
      const swap = primary;
      primary = alt;
      alt = swap;
    } else if (
      preferredObjective === "lowest_mass" &&
      alt &&
      primary &&
      alt.finalAudit.metrics.totalMass < primary.finalAudit.metrics.totalMass
    ) {
      const swap = primary;
      primary = alt;
      alt = swap;
    }

    const formatPlan = (p: typeof primary) =>
      p
        ? {
            planName: p.planName,
            strategy: p.strategy,
            feasible: p.feasible,
            tradeOffSummary: p.tradeOffSummary,
            finalPassCount: p.finalAudit.passCount,
            finalCost: p.finalAudit.metrics.totalCost,
            budget: gc.mission!.budget,
            finalMass: p.finalAudit.metrics.totalMass,
            steps: p.steps.map((s) => ({
              action: s.action,
              componentId: s.component.id,
              componentName: s.component.name,
              quantity: s.quantity,
              roleId: s.component.roleId,
              roleLabel: s.roleLabel,
              stationQuadrant: s.stationQuadrant,
              unitCost: s.component.cost,
              unitMass: s.component.mass,
              reason: s.reason,
            })),
            roleAssignments: p.roleAssignments,
          }
        : null;

    return {
      ok: true,
      missionId: gc.mission.id,
      missionName: gc.mission.name,
      currentLaunchReady: report.currentLaunchReady,
      recommendedPlan: formatPlan(primary),
      alternativePlan: formatPlan(alt),
      roleLimitedNote: report.roleLimitedNote,
    };
  },
};

