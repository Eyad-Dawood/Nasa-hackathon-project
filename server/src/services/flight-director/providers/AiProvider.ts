import type { IntentClassification } from "../types/AiTypes";
import type { DynamicGameContext } from "../types/ContextTypes";
import type { ToolSchemaDefinition } from "../types/ToolTypes";

export type ProviderErrorCode = "TIMEOUT" | "ABORTED" | "PROVIDER_ERROR";

export class AiProviderError extends Error {
  readonly code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}

export interface ProviderFunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ProviderConversationMessage {
  role: "user" | "model";
  parts: Array<Record<string, unknown>>;
}

export interface ProviderTurnInput {
  model: string;
  systemPrompt: string;
  contents: ProviderConversationMessage[];
  toolSchemas: ToolSchemaDefinition[];
  classification: IntentClassification;
  gameContext: DynamicGameContext;
  signal: AbortSignal;
  onTextDelta: (delta: string) => void;
}

export interface ProviderTurnOutput {
  text: string;
  functionCalls: ProviderFunctionCall[];
  modelParts: Array<Record<string, unknown>>;
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AiProvider {
  readonly providerName: "gemini" | "mock";
  generateTurn(input: ProviderTurnInput): Promise<ProviderTurnOutput>;
}

