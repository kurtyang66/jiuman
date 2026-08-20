import { ProviderConfigurationError } from "../errors.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "./types.js";

/**
 * Gemini remains a selectable provider slot, but is intentionally unconfigured
 * for P1 because the maintainer cannot create a key in the current region.
 */
export class GeminiProvider implements GenerationProvider {
  readonly name = "gemini";
  readonly model: string;
  readonly configured = false;

  constructor(model = "") {
    this.model = model.trim() || "unconfigured";
  }

  async generate(_request: GenerationRequest): Promise<GenerationResult> {
    throw new ProviderConfigurationError(
      "Gemini is retained as an unconfigured provider. P1 uses OpenRouter Free instead.",
    );
  }
}
