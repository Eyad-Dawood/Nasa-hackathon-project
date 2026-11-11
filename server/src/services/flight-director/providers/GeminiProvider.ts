import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/genai";
import { redactPotentialSecrets } from "../guardrails/FlightDirectorGuardrails";
import {
  AiProvider,
  AiProviderError,
  ProviderFunctionCall,
  ProviderTurnInput,
  ProviderTurnOutput,
} from "./AiProvider";

export class GeminiProvider implements AiProvider {
  readonly providerName = "gemini" as const;
  private readonly apiKey?: string;
  private client: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey?.trim() || undefined;
  }

  private getClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new AiProviderError(
        "PROVIDER_ERROR",
        "GEMINI_API_KEY is not configured on the server. Set GEMINI_API_KEY in server/.env.local or use AI_PROVIDER=mock.",
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: { apiVersion: "v1beta" },
      });
    }
    return this.client;
  }

  async generateTurn(input: ProviderTurnInput): Promise<ProviderTurnOutput> {
    if (input.signal.aborted) {
      throw new AiProviderError("ABORTED", "Request was aborted before model call.");
    }

    const ai = this.getClient();
    const functionDeclarations: FunctionDeclaration[] = input.toolSchemas.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.parametersJsonSchema,
    }));

    let accumulatedText = "";
    const modelParts: Array<Record<string, unknown>> = [];
    const functionCalls: ProviderFunctionCall[] = [];
    let usage: ProviderTurnOutput["usage"];

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let hasEmittedOutput = false;
      try {
        const stream = await ai.models.generateContentStream({
          model: input.model,
          contents: input.contents as unknown as Content[],
          config: {
            systemInstruction: input.systemPrompt,
            ...(functionDeclarations.length > 0
              ? { tools: [{ functionDeclarations }] }
              : {}),
            temperature: 0.25,
            abortSignal: input.signal,
          },
        });

        for await (const chunk of stream) {
          if (input.signal.aborted) {
            throw new AiProviderError("ABORTED", "Request aborted while streaming response.");
          }

          let deltaFromParts = "";
          let sawCandidateParts = false;
          const candidateParts = chunk.candidates?.[0]?.content?.parts as Part[] | undefined;

          if (Array.isArray(candidateParts) && candidateParts.length > 0) {
            sawCandidateParts = true;
            for (const part of candidateParts) {
              modelParts.push(part as unknown as Record<string, unknown>);
              if (part.functionCall && part.functionCall.name) {
                hasEmittedOutput = true;
                functionCalls.push({
                  id: part.functionCall.id,
                  name: part.functionCall.name,
                  args: (part.functionCall.args ?? {}) as Record<string, unknown>,
                });
              }
              if (typeof part.text === "string" && !part.thought && part.text.length > 0) {
                deltaFromParts += part.text;
              }
            }
          } else if (Array.isArray(chunk.functionCalls)) {
            for (const fc of chunk.functionCalls) {
              if (fc.name) {
                hasEmittedOutput = true;
                functionCalls.push({
                  id: fc.id,
                  name: fc.name,
                  args: (fc.args ?? {}) as Record<string, unknown>,
                });
                modelParts.push({ functionCall: fc } as Record<string, unknown>);
              }
            }
          }

          const delta = sawCandidateParts ? deltaFromParts : chunk.text;
          if (typeof delta === "string" && delta.length > 0) {
            hasEmittedOutput = true;
            accumulatedText += delta;
            input.onTextDelta(delta);
          }

          if (chunk.usageMetadata) {
            usage = {
              promptTokens: chunk.usageMetadata.promptTokenCount,
              outputTokens: chunk.usageMetadata.candidatesTokenCount,
              totalTokens: chunk.usageMetadata.totalTokenCount,
            };
          }
        }

        if (modelParts.length === 0 && accumulatedText.length > 0) {
          modelParts.push({ text: accumulatedText });
        }

        return {
          text: accumulatedText,
          functionCalls,
          modelParts,
          usage,
        };
      } catch (err) {
        if (err instanceof AiProviderError) throw err;
        if (input.signal.aborted) {
          throw new AiProviderError("ABORTED", "Request aborted or timed out.");
        }

        const rawMessage = err instanceof Error ? err.message : String(err);
        const isQuotaExhausted =
          /RequestsPerDay|per day|billing details|quota exceeded/i.test(rawMessage);
        const isTransient =
          !hasEmittedOutput &&
          !isQuotaExhausted &&
          attempt < maxAttempts &&
          /(?:503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|ECONNRESET|ETIMEDOUT)/i.test(
            rawMessage,
          );

        if (isTransient) {
          const delayMs = attempt * 750;
          await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
              clearTimeout(timer);
              reject(new AiProviderError("ABORTED", "Request aborted during retry backoff."));
            };
            const timer = setTimeout(() => {
              input.signal.removeEventListener("abort", onAbort);
              resolve();
            }, delayMs);
            input.signal.addEventListener("abort", onAbort, { once: true });
          });
          continue;
        }

        const safeMessage = redactPotentialSecrets(rawMessage);
        if (rawMessage.toLowerCase().includes("abort") || rawMessage.toLowerCase().includes("timeout")) {
          throw new AiProviderError("TIMEOUT", `Gemini request timed out: ${safeMessage}`);
        }
        throw new AiProviderError("PROVIDER_ERROR", `Gemini provider error: ${safeMessage}`);
      }
    }

    throw new AiProviderError("PROVIDER_ERROR", "Gemini provider exhausted retry attempts.");
  }
}

