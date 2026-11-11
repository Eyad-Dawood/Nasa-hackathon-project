import type { RoleId } from "../data/GameCatalog";

export type SupportedLanguage = "en" | "ar";

export type FlightDirectorIntent =
  | "readiness_evaluation"
  | "failure_diagnosis"
  | "component_recommendation"
  | "budget_optimization"
  | "what_if_simulation"
  | "role_guidance"
  | "crew_coordination"
  | "power_thermal_analysis"
  | "thrust_fuel_analysis"
  | "comms_data_analysis"
  | "computing_science_analysis"
  | "mission_briefing"
  | "real_space_science"
  | "compare_parts"
  | "general_help";

export interface IntentClassification {
  primaryIntent: FlightDirectorIntent;
  secondaryIntents: FlightDirectorIntent[];
  language: SupportedLanguage;
  detectedPartIds: string[];
  detectedMissionIds: string[];
  isAdversarial: boolean;
  confidence: number;
}

export interface AiStatusEvent {
  requestId: string;
  phase:
    | "analyzing"
    | "gathering_telemetry"
    | "running_tools"
    | "optimizing"
    | "retrieving_knowledge"
    | "verifying"
    | "streaming";
  label: string;
  toolName?: string;
}

export interface AiChunkEvent {
  requestId: string;
  delta: string;
}

export interface RecommendedActionItem {
  componentId: string;
  componentName: string;
  action: "add" | "remove" | "replace";
  quantity: number;
  roleId: RoleId;
  roleLabel: string;
  stationQuadrant: string;
  cost: number;
  mass: number;
  reason: string;
}

export interface AiDoneMetadata {
  requestId: string;
  provider: string;
  model: string;
  language: SupportedLanguage;
  intents: FlightDirectorIntent[];
  toolsCalled: string[];
  toolCallCount: number;
  launchReady: boolean | null;
  passCount: number | null;
  totalRules: number;
  missionId: string | null;
  recommendations: RecommendedActionItem[];
  citations: Array<{ title: string; organization: string; url: string }>;
  warnings: string[];
  latencyMs: number;
  tokenUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AiDoneEvent {
  requestId: string;
  fullText: string;
  metadata: AiDoneMetadata;
}

export interface AiErrorEvent {
  requestId: string;
  code:
    | "RATE_LIMITED"
    | "BUSY"
    | "INVALID_REQUEST"
    | "TIMEOUT"
    | "PROVIDER_ERROR"
    | "ABORTED";
  message: string;
}

export interface AiStreamCallbacks {
  onStatus: (event: AiStatusEvent) => void;
  onChunk: (event: AiChunkEvent) => void;
  onDone: (event: AiDoneEvent) => void;
  onError: (event: AiErrorEvent) => void;
}

export interface AiRequestInput {
  requestId: string;
  gameRoomId: string;
  sessionId: string;
  message: string;
  localHeldItemId?: string | null;
  languageHint?: SupportedLanguage;
}

export interface AiProviderConfig {
  provider: "gemini" | "mock";
  apiKey?: string;
  model: string;
  timeoutMs: number;
  toolTimeoutMs: number;
  maxToolRounds: number;
  maxHistoryTurns: number;
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
  promptVersion: string;
}

