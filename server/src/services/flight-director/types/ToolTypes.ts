import type { DynamicGameContext } from "./ContextTypes";

export type FlightDirectorToolName =
  | "get_mission_details"
  | "get_ship_status"
  | "run_launch_audit"
  | "search_components"
  | "get_component_details"
  | "compare_components"
  | "simulate_ship_changes"
  | "recommend_next_components"
  | "find_feasible_build_plan"
  | "get_player_role_guidance"
  | "get_team_coordination_plan"
  | "search_space_knowledge";

export interface ToolExecutionContext {
  gameContext: DynamicGameContext;
  requestId: string;
}

export interface ToolSchemaDefinition {
  name: FlightDirectorToolName;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
}

export interface ToolCallRecord {
  toolName: FlightDirectorToolName;
  args: Record<string, unknown>;
  ok: boolean;
  durationMs: number;
  summary: string;
}

