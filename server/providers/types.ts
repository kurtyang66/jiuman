export const OUTPUT_MODES = ["reply_only", "reply_with_analysis"] as const;
export type OutputMode = (typeof OUTPUT_MODES)[number];

export type GenerationRequest = {
  systemPrompt: string;
  userPrompt: string;
  outputMode: OutputMode;
};

export type GenerationResult = {
  text: string;
  model?: string;
};

export interface GenerationProvider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
