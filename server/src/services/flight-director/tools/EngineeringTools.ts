import { z } from "zod";
import {
  DepartmentId,
  GameCatalog,
  ROLE_LABELS,
  RoleId,
} from "../data/GameCatalog";
import { runDeterministicAudit } from "../data/DeterministicAudit";
import { FlightDirectorOptimizer } from "../FlightDirectorOptimizer";
import type { RegisteredTool } from "./MissionTools";

const optimizer = new FlightDirectorOptimizer();

export const runLaunchAuditTool: RegisteredTool = {
  schemaDef: {
    name: "run_launch_audit",
    description:
      "Execute the authoritative 12-rule spacecraft engineering launch audit on the live Colyseus ship manifest and active mission.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        includePassingChecks: {
          type: "boolean",
          description: "Whether to include all 12 checks or focus details on failures (default true).",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      includePassingChecks: z.boolean().optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const gc = ctx.gameContext;
    const includePassing = args.includePassingChecks !== false;
    const itemIds = gc.shipManifest.map((i) => i.itemId);
    const audit = runDeterministicAudit(itemIds, gc.mission);

    return {
      ok: true,
      missionId: audit.missionId,
      missionName: audit.missionName,
      destination: audit.destination,
      launchReady: audit.launchReady,
      passCount: audit.passCount,
      totalRules: 12,
      failCount: audit.failCount,
      failingRuleIds: audit.failingRuleIds,
      structure: audit.structure,
      metrics: audit.metrics,
      checks: includePassing
        ? audit.checks
        : audit.checks.filter((c) => !c.pass),
    };
  },
};

export const searchComponentsTool: RegisteredTool = {
  schemaDef: {
    name: "search_components",
    description:
      "Search the real 84-component catalog in game_data.json by text query, department/role, category, or max credit cost.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword like solar, nuclear, ion, dish, radar, shield." },
        department: {
          type: "string",
          enum: ["power_thermal", "structure_computing", "communications", "science"],
        },
        roleId: {
          type: "string",
          enum: ["powerAndThermal", "structureAndComputing", "Communications", "Science"],
        },
        category: { type: "string", description: "Optional category e.g. frame, engine, battery, radio, sensor." },
        maxCost: { type: "number", description: "Maximum credit cost filter." },
        limit: { type: "number", description: "Max results (1..15, default 8)." },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      query: z.string().trim().max(80).optional(),
      department: z
        .enum(["power_thermal", "structure_computing", "communications", "science"])
        .optional(),
      roleId: z
        .enum(["powerAndThermal", "structureAndComputing", "Communications", "Science"])
        .optional(),
      category: z.string().trim().max(40).optional(),
      maxCost: z.number().min(0).max(2000).optional(),
      limit: z.number().int().min(1).max(15).optional(),
    })
    .strict(),
  execute: async (args) => {
    const q = typeof args.query === "string" ? args.query.toLowerCase() : "";
    const dept = args.department as DepartmentId | undefined;
    const role = args.roleId as RoleId | undefined;
    const cat = typeof args.category === "string" ? args.category.toLowerCase() : "";
    const maxCost = typeof args.maxCost === "number" ? args.maxCost : Infinity;
    const limit = typeof args.limit === "number" ? args.limit : 8;

    const matches = GameCatalog.getAllComponents()
      .filter((c) => {
        if (dept && c.department !== dept) return false;
        if (role && c.roleId !== role) return false;
        if (cat && c.category.toLowerCase() !== cat) return false;
        if (c.cost > maxCost) return false;
        if (q) {
          const hay = `${c.id} ${c.name} ${c.category} ${c.good} ${c.watchOut}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice(0, limit);

    return {
      ok: true,
      count: matches.length,
      components: matches.map((c) => ({
        id: c.id,
        name: c.name,
        roleId: c.roleId,
        roleLabel: ROLE_LABELS[c.roleId],
        stationQuadrant: GameCatalog.getStationByRole(c.roleId)?.quadrant,
        category: c.category,
        cost: c.cost,
        mass: c.mass,
        size: c.size,
        maxPerShip: c.maxPerShip,
        good: c.good,
        watchOut: c.watchOut,
      })),
    };
  },
};

export const getComponentDetailsTool: RegisteredTool = {
  schemaDef: {
    name: "get_component_details",
    description:
      "Retrieve complete authoritative stats, install count, station location, and limits for specific component IDs (PT01..SI20).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        componentIds: {
          type: "array",
          items: { type: "string" },
          description: "List of component IDs (e.g. ['PT23', 'SC08']).",
        },
      },
      required: ["componentIds"],
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      componentIds: z.array(z.string().trim().min(2).max(10)).min(1).max(10),
    })
    .strict(),
  execute: async (args, ctx) => {
    const ids = (args.componentIds as string[]).map((id) => id.toUpperCase());
    const found: Array<Record<string, unknown>> = [];
    const notFoundIds: string[] = [];

    for (const id of ids) {
      const c = GameCatalog.getComponentById(id);
      if (!c) {
        notFoundIds.push(id);
        continue;
      }
      const installedCount = ctx.gameContext.shipManifest.filter((m) => m.itemId === c.id).length;
      found.push({
        ...c,
        roleLabel: ROLE_LABELS[c.roleId],
        stationQuadrant: GameCatalog.getStationByRole(c.roleId)?.quadrant,
        currentlyInstalledCount: installedCount,
        remainingAllowed: c.maxPerShip === null ? null : Math.max(0, c.maxPerShip - installedCount),
        playerAuthorized: ctx.gameContext.requestingPlayer.roles.includes(c.roleId),
      });
    }

    return {
      ok: true,
      found,
      notFoundIds,
    };
  },
};

export const compareComponentsTool: RegisteredTool = {
  schemaDef: {
    name: "compare_components",
    description:
      "Compare 2 to 5 real spacecraft components side-by-side in the context of the active mission (including solar output scaled by mission sunlightPct).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        componentIds: {
          type: "array",
          items: { type: "string" },
          description: "2 to 5 component IDs to compare.",
        },
      },
      required: ["componentIds"],
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      componentIds: z.array(z.string().trim().min(2).max(10)).min(2).max(5),
    })
    .strict(),
  execute: async (args, ctx) => {
    const ids = (args.componentIds as string[]).map((id) => id.toUpperCase());
    const sunlightFactor = (ctx.gameContext.mission?.sunlightPct ?? 100) / 100;
    const distanceRating = ctx.gameContext.mission?.distanceRating ?? 1;
    const comparisons: Array<Record<string, unknown>> = [];
    const notFoundIds: string[] = [];

    for (const id of ids) {
      const c = GameCatalog.getComponentById(id);
      if (!c) {
        notFoundIds.push(id);
        continue;
      }
      const effectivePowerMade =
        c.powerMade !== undefined
          ? Math.round((c.solar ? c.powerMade * sunlightFactor : c.powerMade) * 10) / 10
          : undefined;
      const impliedMissionFuelRequired =
        c.fuelBurn !== undefined && c.fuelBurn > 0
          ? Math.round(c.fuelBurn * distanceRating * 10) / 10
          : 0;

      comparisons.push({
        id: c.id,
        name: c.name,
        category: c.category,
        roleId: c.roleId,
        stationQuadrant: GameCatalog.getStationByRole(c.roleId)?.quadrant,
        cost: c.cost,
        mass: c.mass,
        size: c.size,
        maxPerShip: c.maxPerShip,
        powerMadeBase: c.powerMade,
        effectivePowerMadeInMission: effectivePowerMade,
        solar: Boolean(c.solar),
        powerUse: c.powerUse ?? 0,
        thrust: c.thrust,
        fuelBurn: c.fuelBurn,
        impliedMissionFuelRequired,
        heatProtection: c.heatProtection,
        radiationProtection: c.radiationProtection,
        signalRange: c.signalRange,
        dataRate: c.dataRate,
        sciencePoints: c.sciencePoints,
        good: c.good,
        watchOut: c.watchOut,
      });
    }

    return {
      ok: comparisons.length >= 2,
      missionId: ctx.gameContext.mission?.id ?? null,
      sunlightPct: ctx.gameContext.mission?.sunlightPct ?? 100,
      distanceRating,
      comparisons,
      notFoundIds,
    };
  },
};

export const recommendNextComponentsTool: RegisteredTool = {
  schemaDef: {
    name: "recommend_next_components",
    description:
      "Recommend the highest-priority next component(s) to install right now based on the live 12-rule audit, structure checks, remaining budget, and player roles.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        roleOnly: {
          type: "boolean",
          description: "If true, filter recommendations strictly to the requesting player's roles.",
        },
        maxSuggestions: {
          type: "number",
          description: "Number of prioritized suggestions to return (1..6, default 3).",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      roleOnly: z.boolean().optional(),
      maxSuggestions: z.number().int().min(1).max(6).optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const gc = ctx.gameContext;
    if (!gc.mission) {
      return {
        ok: false,
        error: "No active mission selected. Select mission M01–M06 before requesting build steps.",
        suggestions: [],
      };
    }

    const roleOnly = Boolean(args.roleOnly);
    const maxSuggestions = typeof args.maxSuggestions === "number" ? args.maxSuggestions : 3;
    const currentIds = gc.shipManifest.map((m) => m.itemId);
    const audit = runDeterministicAudit(currentIds, gc.mission);

    if (audit.launchReady) {
      return {
        ok: true,
        launchReady: true,
        suggestions: [],
        note: "Spacecraft already satisfies all 12 rules! Proceed to ship interaction -> Initiate Launch Sequence.",
      };
    }

    const plan = optimizer.findBuildPlans({
      mission: gc.mission,
      currentItemIds: currentIds,
    });

    const playerRoles = gc.requestingPlayer.roles;
    const rawSteps = plan.recommendedPlan?.steps ?? [];

    const filteredSteps = roleOnly
      ? rawSteps.filter((s) => playerRoles.includes(s.component.roleId))
      : rawSteps;

    const suggestions = filteredSteps.slice(0, maxSuggestions).map((s) => ({
      componentId: s.component.id,
      componentName: s.component.name,
      action: s.action,
      quantity: s.quantity,
      roleId: s.component.roleId,
      roleLabel: s.roleLabel,
      stationQuadrant: s.stationQuadrant,
      cost: s.component.cost,
      mass: s.component.mass,
      reason: s.reason,
      authorizedForRequestingPlayer: playerRoles.includes(s.component.roleId),
      isRoleUnassignedInCrew: gc.unassignedRoles.includes(s.component.roleId),
    }));

    return {
      ok: true,
      launchReady: false,
      currentPassCount: audit.passCount,
      failingRuleIds: audit.failingRuleIds,
      remainingBudget: Math.max(0, gc.mission.budget - audit.metrics.totalCost),
      suggestions,
      totalStepsToLaunchReady: rawSteps.length,
    };
  },
};

