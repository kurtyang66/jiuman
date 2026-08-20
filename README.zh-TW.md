# Jiuman

[English](README.md) · **繁體中文**

Jiuman 是一個開源的「關係對話人格（persona）／Skill」，目標不是把回覆修飾成理想伴侶，而是盡量保留一套具有明顯情緒邏輯、矛盾、吃醋、計分與試探傾向的對話風格。

目前版本：**v0.3.3**

> Jiuman 是虛構對話人格，與任何公眾人物無關，也不代表、模仿或獲任何公眾人物背書。

## Jiuman 在做什麼

Jiuman 在處理關係事件時，常常會先問一個隱性的問題：

> 「這件事代表我在這段關係裡的位置是什麼？」

因此，它對「重要性、優先順位、是否被替代、付出是否對等、誠意有沒有被看見」的敏感度，通常高於單純的事情本身。

這套人格會刻意保留不完美的互動特徵，例如：

- 吃醋與被替代敏感度
- 關係計分：`扣分`、`大扣分`、`加分`、`彌補`
- 把立即行動視為誠意，例如「現在才有誠意」
- 第三者比較與優先順位比較
- `開玩笑 → 試探 → 認真的開玩笑` 的責任漂移
- 輕微批評時先防禦、否認或反問，而不是立刻成熟道歉
- 嚴重關係破裂時，能切換成較低姿態、正式的反省與道歉模式
- 一般、低風險對話仍應保持正常，不應無故製造戲劇化衝突

## Screenshot-grounded calibration

Jiuman 的部分校準來自維護者提供的對話截圖，並轉化為「虛構角色的可觀察對話規則」。

目前已加入的核心機制包括：

- relationship scorekeeping
- concrete repair / proof-of-love
- immediacy-as-sincerity
- third-party pressure
- joke/test/serious responsibility drift
- direct judgment vocabulary
- practical cooperation mode
- formal remorse mode
- anti-poetic / anti-generic relationship-AI 規則

詳細例子見：

- [`examples/screenshot-ground-truth.md`](examples/screenshot-ground-truth.md)
- [`evals/screenshot-fidelity-cases.json`](evals/screenshot-fidelity-cases.json)

目前 v0.3.3 共保留 **114 個 persona / fidelity eval fixtures**。

## 使用方式

### 1. 直接使用 `SKILL.md`

`SKILL.md` 是人格行為的唯一 source of truth。你可以在支援自訂 Skill／persona 指令的環境中直接載入它。

### 2. ChatGPT App / MCP

專案提供一個 stateless MCP server，主要工具為：

- `reply_as_jiuman` — 根據最新伴侶訊息與可選上下文，產生 Jiuman 風格回覆

MCP endpoint：

```text
/mcp
```

### 3. REST / Custom GPT Action

也提供 stateless REST endpoint：

```text
POST https://jiuman.vercel.app/api/reply
```

可搭配 [`docs/gpt-action-openapi.yaml`](docs/gpt-action-openapi.yaml) 建立 Custom GPT Action。

## Provider / BYOK

Jiuman 採 provider-agnostic 架構。模型由環境變數選擇，並不把特定模型寫死在人格邏輯裡。

目前維護者用來做 deterministic smoke test 的 reference model 是：

```text
google/gemma-4-26b-a4b-it:free
```

OpenRouter 僅是目前的測試 provider；自架使用者可以透過 `OPENROUTER_MODEL` 指定其他模型。

```sh
cp .env.example .env.local

GENERATION_PROVIDER=openrouter
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

API key 必須留在 server 端，請勿提交到 GitHub，也不要放進聊天內容。

## 本機開發

需要 Node.js 20+。

```sh
npm install
npm run typecheck
npm test
npm run build
npm run smoke:local
npm start
```

Health check：

```text
http://localhost:3000/healthz
```

`npm test` 與 `npm run smoke:local` 使用 mock provider，不會消耗外部 LLM API 額度。

## 隱私與安全界線

目前架構：

- 不建立 conversation database
- 不保存 transcript
- 不持久化 raw chat
- 不記錄 raw request body
- 不把 OpenRouter key 暴露給 Custom GPT / MCP client

Jiuman 可以在故事／角色層面呈現不成熟、操控式或具壓力感的互動，但不會把性壓力、生育壓力、金融壓力、跟蹤、孤立、威脅、勒索等行為轉化成可操作的策略或教學。Consent、bodily autonomy、privacy 與離開關係的自由仍是不可突破的界線。

另外，若你把真實私人對話送給第三方模型 provider，仍應先確認該 provider 的資料保留、隱私與資料落地政策。

## 主要檔案

- `SKILL.md` — Jiuman 人格 source of truth
- `examples/` — 代表性對話與校準資料
- `evals/` — persona / screenshot fidelity regression fixtures
- `server/` — MCP server 與 provider abstraction
- `api/reply.ts` — stateless REST / GPT Action adapter
- `docs/gpt-action-openapi.yaml` — Custom GPT Action OpenAPI schema
- `tests/` — unit / contract tests

## License

MIT。詳見 [`LICENSE`](LICENSE)。
