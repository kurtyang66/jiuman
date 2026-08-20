import {
  ProviderConfigurationError,
  ProviderError,
  ProviderRateLimitError,
  ProviderResponseError,
} from "../errors.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "./types.js";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_FREE_MODEL = "openrouter/free";
export const OPENROUTER_DEFAULT_MODEL = "google/gemma-4-31b-it:free";

export function isFreeOpenRouterModel(model: string): boolean {
  const normalized = model.trim();
  return normalized === OPENROUTER_FREE_MODEL || normalized.endsWith(":free");
}

type Sleep = (milliseconds: number) => Promise<void>;

export type OpenRouterProviderOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  siteUrl?: string;
  appName?: string;
  fetchImpl?: typeof fetch;
  sleep?: Sleep;
  maxRetries?: number;
};

type OpenRouterResponse = {
  model?: unknown;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function responseContent(payload: OpenRouterResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function retryAfterMilliseconds(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 10_000);
    }
  }

  return Math.min(2_000, 250 * 2 ** attempt);
}

function shouldRetry(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export class OpenRouterProvider implements GenerationProvider {
  readonly name = "openrouter";
  readonly model: string;
  lastResolvedModel?: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly siteUrl?: string;
  private readonly appName?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: Sleep;
  private readonly maxRetries: number;

  constructor(options: OpenRouterProviderOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.model = options.model?.trim() || OPENROUTER_DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl || OPENROUTER_DEFAULT_BASE_URL).replace(/\/$/, "");
    this.siteUrl = options.siteUrl?.trim() || undefined;
    this.appName = options.appName?.trim() || undefined;
    this.fetchImpl = options.fetchImpl || fetch;
    this.sleep = options.sleep || defaultSleep;
    this.maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 0));
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        "OpenRouter is not configured. Set OPENROUTER_API_KEY for live generation.",
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (this.siteUrl) headers["HTTP-Referer"] = this.siteUrl;
    if (this.appName) headers["X-Title"] = this.appName;

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      reasoning: {
        effort: "none",
        exclude: true,
      },
      temperature: request.outputMode === "reply_with_analysis" ? 0.4 : 0.7,
      max_tokens: request.outputMode === "reply_with_analysis" ? 320 : 220,
    };

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
      } catch (cause) {
        throw new ProviderError("OpenRouter request could not be sent.", {
          code: "NETWORK_ERROR",
          retryable: true,
          cause,
        });
      }

      if (!response.ok) {
        if (response.status === 429) {
          if (attempt < this.maxRetries) {
            await this.sleep(retryAfterMilliseconds(response, attempt));
            continue;
          }
          throw new ProviderRateLimitError("OpenRouter rate limit reached.");
        }

        if (shouldRetry(response.status) && attempt < this.maxRetries) {
          await this.sleep(retryAfterMilliseconds(response, attempt));
          continue;
        }

        throw new ProviderError(`OpenRouter returned HTTP ${response.status}.`, {
          code: "UPSTREAM_ERROR",
          status: response.status,
          retryable: shouldRetry(response.status),
        });
      }

      let payload: OpenRouterResponse;
      try {
        payload = (await response.json()) as OpenRouterResponse;
      } catch (cause) {
        throw new ProviderResponseError("OpenRouter returned invalid JSON.", { cause });
      }

      const text = responseContent(payload);
      if (!text) {
        throw new ProviderResponseError("OpenRouter returned an empty assistant message.");
      }

      const resolvedModel = typeof payload.model === "string" ? payload.model : this.model;
      this.lastResolvedModel = resolvedModel;
      return { text, model: resolvedModel };
    }

    throw new ProviderResponseError("OpenRouter request did not produce a response.");
  }
}
