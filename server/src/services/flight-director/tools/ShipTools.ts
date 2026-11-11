import { z } from "zod";
import {
  ALL_ROLE_IDS,
  GameCatalog,
  ROLE_LABELS,
  RoleId,
} from "../data/GameCatalog";
import { runDeterministicAudit } from "../data/DeterministicAudit";
import { FlightDirectorOptimizer } from "../FlightDirectorOptimizer";
import type { ToolExecutionContext } from "../types/ToolTypes";
import type { RegisteredTool } from "./MissionTools";

const optimizer = new FlightDirectorOptimizer();

export const getShipStatusTool: RegisteredTool = {
  schemaDef: {
    name: "get_ship_status",
    description:
      "Inspect the currently installed spacecraft modules, player roles, locally held component, stations, and unassigned crew roles from authoritative Colyseus state.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  zodSchema: z.object({}).strict(),
  execute: async (_args, ctx) => {
    const gc = ctx.gameContext;
    const groupedCounts = new Map<
      string,
      { id: string; name: string; roleId: RoleId; category: string; count: number; totalCost: number; totalMass: number }
    >();

    for (const item of gc.shipManifest) {
      const existing = groupedCounts.get(item.itemId);
      if (existing) {
        existing.count += 1;
        existing.totalCost += item.cost;
        existing.totalMass += item.mass;
      } else {
        groupedCounts.set(item.itemId, {
          id: item.itemId,
          name: item.name,
          roleId: item.roleId,
          category: item.category,
          count: 1,
          totalCost: item.cost,
          totalMass: item.mass,
        });
      }
    }

    const heldComp = gc.localHeldItemId
      ? GameCatalog.getComponentById(gc.localHeldItemId)
      : undefined;

    return {
      ok: true,
      gameRoomId: gc.gameRoomId,
      missionId: gc.mission?.id ?? null,
      missionName: gc.mission?.name ?? "None Selected",
      installedUnitCount: gc.shipManifest.length,
      installedSummary: Array.from(groupedCounts.values()),
      requestingPlayer: {
        username: gc.requestingPlayer.username,
        roles: gc.requestingPlayer.roles,
        roleLabels: gc.requestingPlayer.roles.map((r) => ROLE_LABELS[r]),
        isHost: gc.requestingPlayer.isHost,
        heldItem: heldComp
          ? {
              id: heldComp.id,
              name: heldComp.name,
              roleId: heldComp.roleId,
              authorizedToInstall: gc.requestingPlayer.roles.includes(heldComp.roleId),
              good: heldComp.good,
            }
          : null,
      },
      crew: gc.crew.map((c) => ({
        username: c.username,
        roles: c.roles,
        roleLabels: c.roles.map((r) => ROLE_LABELS[r]),
        isHost: c.isHost,
        isRequestingPlayer: c.isRequestingPlayer,
      })),
      unassignedRoles: gc.unassignedRoles.map((r) => ({
        roleId: r,
        label: ROLE_LABELS[r],
        stationQuadrant: GameCatalog.getStationByRole(r)?.quadrant ?? r,
      })),
    };
  },
};

export const getPlayerRoleGuidanceTool: RegisteredTool = {
  schemaDef: {
    name: "get_player_role_guidance",
    description:
      "Generate actionable component instructions specifically filtered to what the requesting player is authorized to pick up and install using their current roles and station.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        focusRule: {
          type: "string",
          description: "Optional failing rule ID to prioritize (e.g. power, thrust, signal, science).",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      focusRule: z.string().trim().max(32).optional(),
    })
    .strict(),
  execute: async (_args, ctx) => {
    const gc = ctx.gameContext;
    const playerRoles = gc.requestingPlayer.roles;
    if (playerRoles.length === 0) {
      return {
        ok: true,
        authorizedRoles: [],
        note: "This player currently has no department roles assigned.",
        actionsForPlayer: [],
      };
    }

    const mission = gc.mission;
    const stations = playerRoles
      .map((r) => GameCatalog.getStationByRole(r))
      .filter(Boolean);

    if (!mission) {
      return {
        ok: true,
        missionSelected: false,
        authorizedRoles: playerRoles.map((r) => ({
          roleId: r,
          label: ROLE_LABELS[r],
          stationQuadrant: GameCatalog.getStationByRole(r)?.quadrant,
        })),
        actionsForPlayer: [],
        note: "Wait for the host to select a mission (M01–M06) before installing subsystem parts.",
      };
    }

    const currentIds = gc.shipManifest.map((i) => i.itemId);
    const fullOpt = optimizer.findBuildPlans({ mission, currentItemIds: currentIds });
    const planSteps = fullOpt.recommendedPlan?.steps ?? [];

    const playerSteps = planSteps.filter((step) =>
      playerRoles.includes(step.component.roleId),
    );
    const otherTeamSteps = planSteps.filter(
      (step) => !playerRoles.includes(step.component.roleId),
    );

    const heldEval = gc.localHeldItemId
      ? (() => {
          const held = GameCatalog.getComponentById(gc.localHeldItemId!);
          if (!held) return null;
          const matchesPlan = playerSteps.some(
            (s) => s.action === "add" && s.component.id === held.id,
          );
          const curCount = currentIds.filter((x) => x === held.id).length;
          const overLimit = held.maxPerShip !== null && curCount >= held.maxPerShip;
          return {
            itemId: held.id,
            name: held.name,
            authorized: playerRoles.includes(held.roleId),
            overMaxPerShip: overLimit,
            matchesRecommendedPlan: matchesPlan,
          };
        })()
      : null;

    return {
      ok: true,
      missionId: mission.id,
      player: gc.requestingPlayer.username,
      stations,
      heldItemEvaluation: heldEval,
      actionsForPlayer: playerSteps.map((s) => ({
        action: s.action,
        componentId: s.component.id,
        componentName: s.component.name,
        quantity: s.quantity,
        roleId: s.component.roleId,
        stationQuadrant: s.stationQuadrant,
        cost: s.component.cost,
        mass: s.component.mass,
        reason: s.reason,
      })),
      teammateOrUnassignedActions: otherTeamSteps.map((s) => ({
        action: s.action,
        componentId: s.component.id,
        componentName: s.component.name,
        quantity: s.quantity,
        roleId: s.component.roleId,
        roleLabel: s.roleLabel,
        stationQuadrant: s.stationQuadrant,
        isRoleCoveredByCrew: !gc.unassignedRoles.includes(s.component.roleId),
      })),
    };
  },
};

export const getTeamCoordinationPlanTool: RegisteredTool = {
  schemaDef: {
    name: "get_team_coordination_plan",
    description:
      "Compute a department-by-department cooperative work breakdown across all 4 roles (Power & Thermal, Structure & Computing, Communications, Science) to bring the current ship to 12/12 launch readiness.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  zodSchema: z.object({}).strict(),
  execute: async (_args, ctx) => {
    const gc = ctx.gameContext;
    if (!gc.mission) {
      return {
        ok: false,
        error: "No active mission selected yet; crew should agree on M01–M06 with the host first.",
      };
    }

    const currentIds = gc.shipManifest.map((i) => i.itemId);
    const currentAudit = runDeterministicAudit(currentIds, gc.mission);
    const opt = optimizer.findBuildPlans({
      mission: gc.mission,
      currentItemIds: currentIds,
    });

    const roleBreakdown = ALL_ROLE_IDS.map((roleId) => {
      const assignedPlayers = gc.crew
        .filter((c) => c.roles.includes(roleId))
        .map((c) => c.username);
      const station = GameCatalog.getStationByRole(roleId)!;
      const tasks = (opt.recommendedPlan?.steps ?? [])
        .filter((s) => s.component.roleId === roleId)
        .map((s) => ({
          action: s.action,
          componentId: s.component.id,
          componentName: s.component.name,
          quantity: s.quantity,
          cost: s.component.cost * s.quantity,
          reason: s.reason,
        }));

      return {
        roleId,
        roleLabel: ROLE_LABELS[roleId],
        stationQuadrant: station.quadrant,
        assignedCrewMembers: assignedPlayers,
        isUnassigned: assignedPlayers.length === 0,
        tasks,
      };
    });

    return {
      ok: true,
      missionId: gc.mission.id,
      missionName: gc.mission.name,
      currentPassCount: currentAudit.passCount,
      currentLaunchReady: currentAudit.launchReady,
      planFeasible: Boolean(opt.recommendedPlan?.feasible),
      projectedCost: opt.recommendedPlan?.finalAudit.metrics.totalCost ?? currentAudit.metrics.totalCost,
      missionBudget: gc.mission.budget,
      projectedPassCount: opt.recommendedPlan?.finalAudit.passCount ?? currentAudit.passCount,
      roleBreakdown,
      unassignedRolesWarning:
        gc.unassignedRoles.length > 0
          ? `Unassigned department(s): ${gc.unassignedRoles.map((r) => ROLE_LABELS[r]).join(", ")}. A player needs those roles in lobby/session to install modules from those stations.`
          : null,
    };
  },
};

