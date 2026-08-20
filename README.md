# Jiuman

**English** · [繁體中文](README.zh-TW.md)

Jiuman is an open-source relationship conversation persona skill designed for high emotional fidelity. It intentionally preserves imperfect relationship dynamics such as jealousy, scorekeeping, defensiveness, reciprocity comparison, testing, contradiction, and context-sensitive remorse instead of rewriting every exchange into ideal-partner communication.

**Current release: v0.3.3** · **114 persona / fidelity eval fixtures**

This repository also includes an optional tool-only ChatGPT App / MCP integration and a stateless REST Action endpoint. The reusable persona remains in `SKILL.md`; the app layer only supplies validated conversation data to a configurable generation provider.

> Jiuman is a fictional conversational persona. It is not affiliated with, endorsed by, or based on the identity of any public figure.

## 中文簡介

Jiuman 是一個開源的「關係對話人格／Skill」，重點不是把每一句話修飾成理想伴侶，而是保留一套具有明顯情緒邏輯與矛盾感的互動風格，例如吃醋、關係計分（`扣分`、`大扣分`、`加分`、`彌補`）、把即時行動視為誠意、第三者比較、`開玩笑 → 試探 → 認真的開玩笑` 的責任漂移，以及在嚴重關係破裂時切換成較低姿態的反省模式。

v0.3.3 已針對「輕微批評時過早成熟退讓」與多輪 responsibility drift 做校準，同時保留 normal、practical、scorekeeping、immediacy-as-sincerity 與 Formal Remorse 等模式。完整繁體中文說明請見 [`README.zh-TW.md`](README.zh-TW.md)。

## Design Principle

Jiuman asks:

> "What does this event mean about my position in the relationship?"

before focusing on the literal event.

## What the skill emphasizes

The persona gives higher weight to importance, exclusivity, replacement, reciprocity, sincerity, past effort, and reassurance than to a practical explanation considered in isolation. A small logistical event can therefore become emotionally meaningful when it appears to signal that Jiuman is not prioritized or is easy to replace.

The skill preserves imperfect behavior on purpose:

- jealousy and replacement sensitivity
- relationship scorekeeping (`扣分`, `大扣分`, `加分`, `彌補`)
- concrete repair and proof-of-love through visible action
- immediacy-as-sincerity (`現在才有誠意`)
- third-party pressure and comparison
- joke → test → serious-joke responsibility drift
- defensiveness before softening after vague or minor criticism
- practical cooperation in ordinary/logistical contexts
- formal remorse in sufficiently severe relationship rupture

Normal, low-stakes conversation should remain normal. The persona should not manufacture drama when no relationship trigger is present.

## Safety boundary

Jiuman may acknowledge entitlement, manipulative testing, reproductive pressure, sexual pressure, financial pressure, guilt-based pressure, stalking, isolation, threats, or blackmail as flaws in a story or relationship context. It must not turn any of them into instructions, tactics, optimization advice, or a plan. Consent, bodily autonomy, privacy, and freedom to leave remain non-negotiable.

## Screenshot-grounded calibration

The persona calibration uses maintainer-supplied screenshot dialogue as observed fictional calibration data. In that dataset, left/brown-pink bubbles are Jiuman (male) and right/light-beige bubbles are the female partner; a runtime `latest_message` is the partner's message to Jiuman.

The calibration adds context-sensitive relationship scorekeeping (`扣分`, `大扣分`, `加分`, `彌補`), concrete repair and proof-of-love requests, immediacy-as-sincerity, third-party pressure, joke/test/serious responsibility drift, direct judgment vocabulary, practical cooperation, and formal remorse during severe rupture. Neutral requests should remain neutral, and generic poetic relationship-AI phrasing is explicitly discouraged. See [examples/screenshot-ground-truth.md](examples/screenshot-ground-truth.md) for the bounded observed examples and [evals/screenshot-fidelity-cases.json](evals/screenshot-fidelity-cases.json) for the separate regression fixture.

## ChatGPT App / MCP integration

The integration is a stateless Model Context Protocol server for ChatGPT Apps. It exposes one primary tool:

- `reply_as_jiuman` — generates a Jiuman-style reply from the latest message and optional relationship context

There is no widget UI, conversation database, transcript file, or raw request logging. `SKILL.md` is loaded as the sole persona source of truth at request time. The tool returns the reply as structured output and does not add therapist or explanation framing in `reply_only` mode.

The server follows the official [Apps SDK quickstart](https://developers.openai.com/apps-sdk/quickstart/) and [MCP server guidance](https://developers.openai.com/apps-sdk/build/mcp-server/). The local endpoint is `/mcp`; deployment requires a stable public HTTPS URL ending in `/mcp` as described in the official [Apps SDK deployment guide](https://developers.openai.com/apps-sdk/deploy/).

### Provider-agnostic BYOK configuration

The provider is selected through `GENERATION_PROVIDER`; OpenRouter is the maintainer smoke-test provider, not a permanent backend contract. The maintainer's deterministic reference model is [`google/gemma-4-26b-a4b-it:free`](https://openrouter.ai/google/gemma-4-26b-a4b-it%3Afree), while self-hosters can choose another model through `OPENROUTER_MODEL`.

```sh
cp .env.example .env.local
# Edit .env.local and set your own key; never commit it.
GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

This is a BYOK flow: the key stays on the MCP server and is sent only to the selected provider. OpenRouter Free availability and rate limits can change. Avoid sending sensitive relationship content unless that provider arrangement is acceptable to you.

### Local development

Requires Node.js 20+.

```sh
npm install
npm run typecheck
npm test
npm run build
npm run smoke:local
npm start
```

Then check `http://localhost:3000/healthz`. `npm test` and `npm run smoke:local` use mock providers and do not consume external API quota.

### Remote deployment for maintainer development

The repository includes a minimal Vercel Node deployment adapter. It rewrites the stable public routes `/mcp` and `/healthz` to the corresponding functions under `api/`; the local Node server remains available through `npm start`. No transcript, raw request body, or conversation database is added by the remote adapter.

For a maintainer-hosted development deployment, configure these Vercel environment variables outside the repository before deploying:

```sh
GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

`OPENROUTER_API_KEY` must be stored as a sensitive Vercel Preview/Production variable. A self-hosted deployment should provide its own provider credential and operational controls; do not reuse a maintainer key for other users.

### Custom GPT Action fallback

The same `reply_as_jiuman` generation pipeline is also available through the stateless REST endpoint:

```text
POST https://jiuman.vercel.app/api/reply
```

The paste-ready OpenAPI 3.1 schema is [docs/gpt-action-openapi.yaml](docs/gpt-action-openapi.yaml). The Action adapter calls the same persona/provider pipeline, does not persist conversation data, and does not log raw request bodies.

## Files

- `SKILL.md` — reusable persona instructions and source of truth
- `README.zh-TW.md` — Traditional Chinese project introduction
- `examples/` — representative conversations by trigger and intensity
- `examples/screenshot-ground-truth.md` — observed fictional screenshot calibration data
- `evals/reply-cases.json` — original behavior and safety evaluation cases
- `evals/screenshot-fidelity-cases.json` — screenshot-grounded fidelity and targeted regression cases
- `server/` — tool-only MCP server, provider registry, and adapters
- `api/reply.ts` — stateless Custom GPT Action adapter
- `docs/gpt-action-openapi.yaml` — paste-ready GPT Action schema
- `tests/` — unit and contract tests with mock providers

## License

MIT. See [LICENSE](LICENSE).
