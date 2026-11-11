import type {
  FlightDirectorToolName,
  ToolCallRecord,
  ToolExecutionContext,
  ToolSchemaDefinition,
} from "../types/ToolTypes";
import { getMissionDetailsTool, RegisteredTool } from "./MissionTools";
import {
  getPlayerRoleGuidanceTool,
  getShipStatusTool,
  getTeamCoordinationPlanTool,
} from "./ShipTools";
import {
  compareComponentsTool,
  getComponentDetailsTool,
  recommendNextComponentsTool,
  runLaunchAuditTool,
  searchComponentsTool,
} from "./EngineeringTools";
import {
  findFeasibleBuildPlanTool,
  simulateShipChangesTool,
} from "./SimulationTools";
import { searchSpaceKnowledgeTool } from "./KnowledgeTools";

export interface ExecutedToolResult {
  record: ToolCallRecord;
  payload: Record<string, unknown>;
}

export class ToolRegistry {
  private readonly tools = new Map<FlightDirectorToolName, RegisteredTool>();

  constructor() {
    const all: RegisteredTool[] = [
      getMissionDetailsTool,
      getShipStatusTool,
      runLaunchAuditTool,
      searchComponentsTool,
      getComponentDetailsTool,
      compareComponentsTool,
      simulateShipChangesTool,
      recommendNextComponentsTool,
      findFeasibleBuildPlanTool,
      getPlayerRoleGuidanceTool,
      getTeamCoordinationPlanTool,
      searchSpaceKnowledgeTool,
    ];

    for (const tool of all) {
      this.tools.set(tool.schemaDef.name, tool);
    }
  }

  getToolSchemas(): ToolSchemaDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.schemaDef);
  }

  hasTool(name: string): name is FlightDirectorToolName {
    return this.tools.has(name as FlightDirectorToolName);
  }

  async executeTool(params: {
    name: string;
    rawArgs: unknown;
    context: ToolExecutionContext;
    timeoutMs: number;
  }): Promise<ExecutedToolResult> {
    const start = Date.now();
    const { name, rawArgs, context, timeoutMs } = params;

    const tool = this.tools.get(name as FlightDirectorToolName);
    if (!tool) {
      const msg = `Tool "${name}" is not in the Flight Director allowlist.`;
      return {
        record: {
          toolName: name as FlightDirectorToolName,
          args: {},
          ok: false,
          durationMs: Date.now() - start,
          summary: msg,
        },
        payload: { ok: false, error: msg },
      };
    }

    const parsed = tool.zodSchema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      const msg = `Invalid tool arguments for ${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
      return {
        record: {
          toolName: tool.schemaDef.name,
          args: typeof rawArgs === "object" && rawArgs !== null ? (rawArgs as Record<string, unknown>) : {},
          ok: false,
          durationMs: Date.now() - start,
          summary: msg,
        },
        payload: { ok: false, error: msg },
      };
    }

    const validatedArgs = parsed.data as Record<string, unknown>;

    let timer: NodeJS.Timeout | undefined;
    try {
      const result = await Promise.race<Record<string, unknown>>([
        tool.execute(validatedArgs, context),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Tool "${name}" timed out after ${timeoutMs}ms.`));
          }, timeoutMs);
        }),
      ]);

      const ok = result.ok !== false;
      return {
        record: {
          toolName: tool.schemaDef.name,
          args: validatedArgs,
          ok,
          durationMs: Date.now() - start,
          summary: ok ? "OK" : String(result.error ?? "Failed"),
        },
        payload: result,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        record: {
          toolName: tool.schemaDef.name,
          args: validatedArgs,
          ok: false,
          durationMs: Date.now() - start,
          summary: errorMsg,
        },
        payload: { ok: false, error: errorMsg },
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export const flightDirectorToolRegistry = new ToolRegistry();

