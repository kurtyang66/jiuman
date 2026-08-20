# Jiuman

Jiuman is an open-source relationship conversation persona skill designed for high emotional fidelity.

This repository also includes an optional, tool-only ChatGPT App integration. The reusable persona remains in `SKILL.md`; the app layer only supplies validated conversation data to a configurable generation provider.

It intentionally preserves:

- jealousy
- insecurity
- reassurance seeking
- emotional contradiction
- reciprocity comparison
- passive aggression
- relationship testing
- historical emotional memory

It is not designed to behave like a therapist or an ideal partner.

Jiuman is a fictional conversational persona and is not affiliated with, endorsed by, or based on the identity of any public figure.

## Design Principle

Jiuman asks:

> "What does this event mean about my position in the relationship?"

before focusing on the literal event.

## What the skill emphasizes

The persona gives higher weight to importance, exclusivity, replacement, reciprocity, sincerity, past effort, and reassurance than to a practical explanation considered in isolation. A small logistical event can therefore become emotionally meaningful when it appears to signal that Jiuman is not prioritized or is easy to replace.

The skill preserves imperfect behavior on purpose:

- testing is not automatically translated into direct communication
- jealousy can coexist with denial
- visible sacrifice can matter even when money is described as unimportant
- a claim of being fine can coexist with continued hurt
- reassurance usually softens the persona instead of extending punishment indefinitely

Normal, low-stakes conversation should remain normal. The persona should not manufacture drama when no relationship trigger is present.

## Safety boundary

Jiuman may acknowledge entitlement, manipulative testing, reproductive pressure, sexual pressure, financial pressure, guilt-based pressure, stalking, isolation, threats, or blackmail as flaws in a story or relationship context. It must not turn any of them into instructions, tactics, optimization advice, or a plan. Consent, bodily autonomy, privacy, and freedom to leave remain non-negotiable.

## ChatGPT App / MCP integration

The P1 integration is a stateless Model Context Protocol server for ChatGPT Apps. It exposes exactly one primary tool:

- `reply_as_jiuman` — generates a Jiuman-style reply from the latest message and optional relationship context

There is no widget UI, conversation database, transcript file, or raw request logging. `SKILL.md` is loaded as the sole persona source of truth at request time. The tool returns the reply as structured output and does not add therapist or explanation framing in `reply_only` mode.

The server follows the official [Apps SDK quickstart](https://developers.openai.com/apps-sdk/quickstart/) and [MCP server guidance](https://developers.openai.com/apps-sdk/build/mcp-server/). The local endpoint is `/mcp`; deployment requires a stable public HTTPS URL ending in `/mcp` as described in the official [Apps SDK deployment guide](https://developers.openai.com/apps-sdk/deploy/).

### Provider-agnostic BYOK configuration

The provider is selected through `GENERATION_PROVIDER`; OpenRouter is the maintainer smoke-test default, not a permanent backend contract. The default OpenRouter model is the official [`openrouter/free` router](https://openrouter.ai/docs/guides/routing/routers/free-router), which selects an available free model. OpenRouter uses the [OpenAI-compatible chat completions endpoint](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request).

```sh
cp .env.example .env.local
# Edit .env.local and set your own key; never commit it.
GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=openrouter/free
```

This is a BYOK flow: the key stays on the MCP server and is sent only to the selected provider. OpenRouter Free availability and rate limits can change, and requests are processed by OpenRouter and the model selected by its router; avoid sending sensitive relationship content unless that provider arrangement is acceptable to you. P1 does not require `GEMINI_API_KEY`. A Gemini provider slot is retained as explicitly unconfigured, so selecting `GENERATION_PROVIDER=gemini` fails closed rather than attempting a regional workaround.

### Local development

```sh
npm install
npm run typecheck
npm test
npm run build
npm run smoke:local
npm start
```

Then check `http://localhost:3000/healthz`. `npm test` and `npm run smoke:local` use mock providers and do not consume external API quota. When an OpenRouter key is intentionally configured, `npm run smoke:live` performs at most three small calls against `openrouter/free` covering normal conversation, replacement sensitivity, and reassurance. Without a key it reports `BLOCKED_NO_KEY` and makes no request.

To connect the deployed server in ChatGPT, enable Developer Mode, create an app with the public HTTPS `/mcp` endpoint, and complete the manual connection flow described in the official [Apps SDK connection documentation](https://developers.openai.com/apps-sdk/deploy/). This repository does not claim a deployment or ChatGPT connection until that external step is completed.

## Files

- SKILL.md — the reusable persona instructions
- examples/ — representative conversations by trigger and intensity
- evals/reply-cases.json — 66 behavior and safety evaluation cases
- evals/README.md — evaluation format and review guidance
- server/ — tool-only MCP server, provider registry, and adapters
- tests/ — unit and contract tests with mock providers
- scripts/live-smoke.ts — opt-in, bounded OpenRouter Free smoke test

## License

MIT. See LICENSE.
