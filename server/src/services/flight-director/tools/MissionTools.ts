import { z } from "zod";
import { GameCatalog } from "../data/GameCatalog";
import type { ToolExecutionContext, ToolSchemaDefinition } from "../types/ToolTypes";

export interface RegisteredTool {
  schemaDef: ToolSchemaDefinition;
  zodSchema: z.ZodTypeAny;
  execute: (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<Record<string, unknown>>;
}

export const getMissionDetailsTool: RegisteredTool = {
  schemaDef: {
    name: "get_mission_details",
    description:
      "Retrieve authoritative mission specifications and constraints from game_data.json (defaults to the room's active mission if missionId is omitted).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        missionId: {
          type: "string",
          description: "Optional mission ID (M01..M06). Defaults to active room mission.",
        },
      },
      additionalProperties: false,
    },
  },
  zodSchema: z
    .object({
      missionId: z.string().trim().min(1).max(12).optional(),
    })
    .strict(),
  execute: async (args, ctx) => {
    const requestedId = typeof args.missionId === "string" ? args.missionId.trim().toUpperCase() : "";
    const mission = requestedId
      ? GameCatalog.getMissionById(requestedId)
      : ctx.gameContext.mission;

    if (!mission) {
      return {
        ok: false,
        error: requestedId
          ? `Mission "${requestedId}" not found. Valid IDs are M01–M06.`
          : "No mission objective is currently selected in this room.",
        availableMissions: GameCatalog.getAllMissions().map((m) => ({
          id: m.id,
          name: m.name,
          destination: m.destination,
          difficulty: m.difficulty,
        })),
      };
    }

    return {
      ok: true,
      isActiveRoomMission: ctx.gameContext.mission?.id === mission.id,
      mission: {
        id: mission.id,
        name: mission.name,
        destination: mission.destination,
        difficulty: mission.difficulty,
        distanceKm: mission.distanceKm,
        distanceRating: mission.distanceRating,
        travelTimeStory: mission.travelTimeStory,
        sunlightPct: mission.sunlightPct,
        nightNeed: mission.nightNeed,
        heatDanger: mission.heatDanger,
        radiation: mission.radiation,
        launchPull: mission.launchPull,
        signalNeed: mission.signalNeed,
        navigationBrain: mission.navigationBrain,
        scienceGoal: mission.scienceGoal,
        budget: mission.budget,
        starInstrumentId: mission.starInstrumentId,
        starInstrument: mission.starInstrument,
        funFact: mission.funFact,
      },
    };
  },
};

