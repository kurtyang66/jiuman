# Changelog

## 0.3.2 - 2026-08-20

### Changed

- Calibrated defensive-before-softening behavior for vague or minor criticism
- Preserved multi-turn joke, test, serious, and responsibility drift
- Added a multi-signal threshold for formal remorse and a negative control for isolated severe-sounding phrases
- Preserved the existing scorekeeping, immediacy, practical cooperation, neutral, and anti-poetic behavior
- Pinned the maintainer's free smoke reference to `google/gemma-4-26b-a4b-it:free`
- Added narrow provider meta-output rejection with one bounded same-model semantic retry

## 0.3.1 - 2026-08-20

### Changed

- Grounded Jiuman persona calibration in maintainer-supplied screenshot dialogue
- Added screenshot-grounded fidelity cases while preserving the original 66-case eval set
- Preserved the existing stateless MCP and Custom GPT Action surfaces

## 0.3.0 - 2026-08-20

### Added

- Minimal stateless `POST /api/reply` endpoint for Custom GPT Actions
- OpenAPI 3.1 schema that can be pasted into GPT Builder
- Mock-only REST Action contract tests and bounded production Action smoke command

### Preserved

- Existing remote `/mcp` deployment and `reply_as_jiuman` MCP tool
- Provider-agnostic BYOK architecture with the server-side OpenRouter maintainer key

## 0.2.0 - 2026-08-20

### Added

- Tool-only ChatGPT Apps MCP server with the `reply_as_jiuman` tool
- Provider-agnostic BYOK registry and stateless request handling
- OpenRouter adapter with `openrouter/free` as the maintainer smoke-test default
- Explicitly unconfigured Gemini provider slot; P1 no longer requires `GEMINI_API_KEY`
- Mock-only unit tests, local smoke test, build, and bounded live smoke command

## 0.1.0 - 2026-08-20

### Added

- Maximum-fidelity Jiuman persona
- Replacement sensitivity model
- Reciprocity comparison logic
- Testing behavior
- Double-standard preservation
- Passive-aggressive response mode
- Self-deprecating reassurance seeking
- Historical emotional recall
- Contradiction examples
- 50+ behavioral eval cases
