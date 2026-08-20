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

## Screenshot-grounded calibration

The persona calibration uses maintainer-supplied screenshot dialogue as observed fictional calibration data. In that dataset, left/brown-pink bubbles are Jiuman (male) and right/light-beige bubbles are the female partner; a runtime `latest_message` is the partner's message to Jiuman.

The calibration adds context-sensitive relationship scorekeeping (`扣分`, `大扣分`, `加分`, `彌補`), concrete repair and proof-of-love requests, immediacy-as-sincerity, third-party pressure, joke/test/serious responsibility drift, direct judgment vocabulary, practical cooperation, and formal remorse during severe rupture. Neutral requests should remain neutral, and generic poetic relationship-AI phrasing is explicitly discouraged. See [examples/screenshot-ground-truth.md](examples/screenshot-ground-truth.md) for the bounded observed examples and [evals/screenshot-fidelity-cases.json](evals/screenshot-fidelity-cases.json) for the separate regression fixture.

## ChatGPT App / MCP integration

The P1 integration is a stateless Model Context Protocol server for ChatGPT Apps. It exposes exactly one primary tool:

- `reply_as_jiuman` — generates a Jiuman-style reply from the latest message and optional relationship context

There is no widget UI, conversation database, transcript file, or raw request logging. `SKILL.md` is loaded as the sole persona source of truth at request time. The tool returns the reply as structured output and does not add therapist or explanation framing in `reply_only` mode.

The server follows the official [Apps SDK quickstart](https://developers.openai.com/apps-sdk/quickstart/) and [MCP server guidance](https://developers.openai.com/apps-sdk/build/mcp-server/). The local endpoint is `/mcp`; deployment requires a stable public HTTPS URL ending in `/mcp` as described in the official [Apps SDK deployment guide](https://developers.openai.com/apps-sdk/deploy/).

### Provider-agnostic BYOK configuration

The provider is selected through `GENERATION_PROVIDER`; OpenRouter is the maintainer smoke-test provider, not a permanent backend contract. The maintainer's deterministic reference model is [`qwen/qwen3-32b:free`](https://openrouter.ai/qwen/qwen3-32b%3Afree), while self-hosters can choose another model through `OPENROUTER_MODEL`. The random [`openrouter/free` router](https://openrouter.ai/docs/guides/routing/routers/free-router) remains an optional free-model choice, not the production acceptance baseline. OpenRouter uses the [OpenAI-compatible chat completions endpoint](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request).

```sh
cp .env.example .env.local
# Edit .env.local and set your own key; never commit it.
GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=qwen/qwen3-32b:free
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

Then check `http://localhost:3000/healthz`. `npm test` and `npm run smoke:local` use mock providers and do not consume external API quota. When an OpenRouter key is intentionally configured, `npm run smoke:live` performs at most three small calls against the configured free model, using the maintainer's fixed Qwen3 32B reference model by default. It records only pass/fail metadata, reply character counts, and configured/resolved model identifiers. Without a key it reports `BLOCKED_NO_KEY` and makes no request.

To connect the deployed server in ChatGPT, enable Developer Mode, create an app with the public HTTPS `/mcp` endpoint, and complete the manual connection flow described in the official [Apps SDK connection documentation](https://developers.openai.com/apps-sdk/deploy/). This repository does not claim a deployment or ChatGPT connection until that external step is completed.

### Remote deployment for maintainer development

The repository includes a minimal Vercel Node deployment adapter. It rewrites the stable public routes `/mcp` and `/healthz` to the corresponding functions under `api/`; the local Node server remains available through `npm start`. No transcript, raw request body, or conversation database is added by the remote adapter.

For a maintainer-hosted development deployment, configure these Vercel environment variables outside the repository before deploying:

```sh
GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=qwen/qwen3-32b:free
```

`OPENROUTER_API_KEY` must be stored as a sensitive Vercel Preview/Production variable. The deployment is a single-maintainer dev endpoint, not a final public multi-user BYOK service: it has no user account layer, OAuth flow, billing, or database. A self-hosted deployment should provide its own provider credential and operational controls; do not reuse a maintainer key for other users.

After the deployment is reachable, verify `/healthz`, MCP initialization, and that `tools/list` contains only `reply_as_jiuman`. The bounded `npm run smoke:remote -- https://your-deployment.example` command performs three real provider-backed calls (normal, replacement sensitivity, and reassurance) and prints only pass/fail metadata. It does not print generated replies.

In ChatGPT Developer Mode, add the public `https://your-deployment.example/mcp` URL through the Plugins/App connection flow, review the discovered tool metadata, refresh the connection after server changes, and run the maintainer evaluation prompts in a new chat. This manual account-side connection is distinct from public submission or marketplace publication.

The maintainer deployment pins `qwen/qwen3-32b:free` for deterministic smoke and rejects provider meta-classifier labels instead of returning them as persona replies. Self-hosters may select another model through `OPENROUTER_MODEL`; no model fallback is performed when the selected model is unavailable. Avoid sending sensitive relationship content unless the selected provider's terms, retention, and data residency are acceptable.

### Custom GPT Action fallback

If ChatGPT Developer Mode is unavailable for the account, the same `reply_as_jiuman` generation pipeline is also available through the stateless REST endpoint:

```text
POST https://jiuman.vercel.app/api/reply
```

The paste-ready OpenAPI 3.1 schema is [docs/gpt-action-openapi.yaml](docs/gpt-action-openapi.yaml). In GPT Builder, open `Configure → Actions → Create new action`, paste that schema, and leave Action authentication unset. The Custom GPT never receives `OPENROUTER_API_KEY`; the maintainer deployment keeps that credential server-side. This endpoint is a maintainer development deployment, not a public multi-user credential service.

The Action adapter calls the existing `createReplyAsJiumanHandler` pipeline and does not duplicate persona or provider logic. It returns the same structured reply fields as the MCP tool, does not persist conversation data, and does not log raw request bodies. Use `npm run smoke:action -- https://your-deployment.example/api/reply` for one bounded real-provider check; it prints only safe pass/fail metadata.

## Files

- SKILL.md — the reusable persona instructions
- examples/ — representative conversations by trigger and intensity
- examples/screenshot-ground-truth.md — observed fictional screenshot calibration data
- evals/reply-cases.json — 66 behavior and safety evaluation cases
- evals/screenshot-fidelity-cases.json — separate screenshot-grounded fidelity cases
- evals/README.md — evaluation format and review guidance
- server/ — tool-only MCP server, provider registry, and adapters
- api/reply.ts — stateless Custom GPT Action adapter
- docs/gpt-action-openapi.yaml — paste-ready GPT Action schema
- tests/ — unit and contract tests with mock providers
- scripts/live-smoke.ts — opt-in, bounded OpenRouter Free smoke test
- scripts/action-smoke.ts — one bounded production REST Action smoke test

## License

MIT. See LICENSE.
