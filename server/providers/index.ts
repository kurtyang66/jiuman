import { ProviderConfigurationError } from "../errors.js";
import { GeminiProvider } from "./gemini.js";
import { OpenRouterProvider, OPENROUTER_FREE_MODEL } from "./openrouter.js";
import type { GenerationProvider } from "./types.js";

export type ProviderEnvironment = Record<string, string | undefined>;

export function createGenerationProvider(
  env: ProviderEnvironment = process.env,
  dependencies: { fetchImpl?: typeof fetch } = {},
): GenerationProvider {
  const providerName = (env.GENERATION_PROVIDER || env.PROVIDER || "openrouter").trim().toLowerCase();

  switch (providerName) {
    case "openrouter":
      return new OpenRouterProvider({
        apiKey: env.OPENROUTER_API_KEY,
        model: env.OPENROUTER_MODEL || OPENROUTER_FREE_MODEL,
        siteUrl: env.OPENROUTER_SITE_URL,
        appName: env.OPENROUTER_APP_NAME || "Jiuman",
        fetchImpl: dependencies.fetchImpl,
      });
    case "gemini":
      return new GeminiProvider(env.GEMINI_MODEL);
    default:
      throw new ProviderConfigurationError(
        `Unsupported generation provider "${providerName}". Choose openrouter or gemini.`,
      );
  }
}

export { GeminiProvider } from "./gemini.js";
export { OpenRouterProvider, OPENROUTER_DEFAULT_BASE_URL, OPENROUTER_FREE_MODEL } from "./openrouter.js";
export type { GenerationProvider, GenerationRequest, GenerationResult, OutputMode } from "./types.js";
