import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { z } from "zod";
import type { AiProviderConfig } from "../types/AiTypes";

const PROMPT_VERSION = "1.0.0";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  AI_PROVIDER: z.enum(["gemini", "mock"]).optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  AI_TOOL_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(5000),
  AI_MAX_TOOL_ROUNDS: z.coerce.number().int().min(1).max(10).default(4),
  AI_MAX_HISTORY_TURNS: z.coerce.number().int().min(1).max(30).default(8),
  AI_MAX_CONCURRENT_REQUESTS: z.coerce.number().int().min(1).max(20).default(2),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).max(120).default(20),
});

let envLoaded = false;

export function loadServerEnv(): void {
  if (envLoaded) return;
  envLoaded = true;

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const serverRoot = path.resolve(currentDir, "../../../../");
  const nodeEnv = process.env.NODE_ENV || "development";

  const candidateFiles = [
    path.join(serverRoot, ".env.local"),
    path.join(serverRoot, `.env.${nodeEnv}`),
    path.join(serverRoot, ".env"),
  ];

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true });
    }
  }
}

export interface LoadedAiConfiguration {
  config: AiProviderConfig;
  geminiKeyConfigured: boolean;
  startupWarning?: string;
}

export function loadAiConfig(overrides?: Partial<AiProviderConfig>): LoadedAiConfiguration {
  loadServerEnv();

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `[AiConfig] Invalid environment configuration: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }

  const rawEnv = parsed.data;
  const trimmedKey = (overrides?.apiKey ?? rawEnv.GEMINI_API_KEY ?? "").trim();
  const geminiKeyConfigured = trimmedKey.length > 0;

  let resolvedProvider: "gemini" | "mock";
  let startupWarning: string | undefined;

  if (overrides?.provider) {
    resolvedProvider = overrides.provider;
  } else if (rawEnv.AI_PROVIDER) {
    resolvedProvider = rawEnv.AI_PROVIDER;
  } else {
    resolvedProvider = geminiKeyConfigured ? "gemini" : "mock";
    if (!geminiKeyConfigured) {
      startupWarning =
        "GEMINI_API_KEY is not set; defaulting AI Flight Director to MockAiProvider (deterministic local tool-calling agent).";
    }
  }

  if (resolvedProvider === "gemini" && !geminiKeyConfigured) {
    startupWarning =
      "AI_PROVIDER=gemini is configured, but GEMINI_API_KEY is empty. Live Gemini calls will fail safely with PROVIDER_ERROR unless GEMINI_API_KEY is supplied or AI_PROVIDER=mock is used.";
  }

  const config: AiProviderConfig = {
    provider: resolvedProvider,
    apiKey: geminiKeyConfigured ? trimmedKey : undefined,
    model: overrides?.model ?? rawEnv.AI_MODEL,
    timeoutMs: overrides?.timeoutMs ?? rawEnv.AI_TIMEOUT_MS,
    toolTimeoutMs: overrides?.toolTimeoutMs ?? rawEnv.AI_TOOL_TIMEOUT_MS,
    maxToolRounds: overrides?.maxToolRounds ?? rawEnv.AI_MAX_TOOL_ROUNDS,
    maxHistoryTurns: overrides?.maxHistoryTurns ?? rawEnv.AI_MAX_HISTORY_TURNS,
    maxConcurrentRequests:
      overrides?.maxConcurrentRequests ?? rawEnv.AI_MAX_CONCURRENT_REQUESTS,
    rateLimitPerMinute: overrides?.rateLimitPerMinute ?? rawEnv.AI_RATE_LIMIT_PER_MINUTE,
    promptVersion: overrides?.promptVersion ?? PROMPT_VERSION,
  };

  return {
    config,
    geminiKeyConfigured,
    startupWarning,
  };
}

export function maskSecret(secret?: string): string {
  if (!secret || secret.length < 6) return secret ? "[redacted]" : "[unset]";
  return `${secret.slice(0, 3)}***${secret.slice(-2)}`;
}

