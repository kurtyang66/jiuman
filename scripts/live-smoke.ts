import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generateReply, isMetaOutput } from "../server/generate.js";
import {
  isFreeOpenRouterModel,
  OpenRouterProvider,
  OPENROUTER_DEFAULT_MODEL,
} from "../server/providers/openrouter.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false, quiet: true });

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.log("OPENROUTER_LIVE_SMOKE=BLOCKED_NO_KEY");
  process.exit(0);
}

const model = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
if (!isFreeOpenRouterModel(model)) {
  console.log(`OPENROUTER_LIVE_SMOKE=SKIPPED_NON_FREE_MODEL model=${model}`);
  process.exit(0);
}

const provider = new OpenRouterProvider({
  apiKey,
  model,
  appName: "Jiuman",
  maxRetries: 0,
});

type ConversationMessage = { speaker: "partner" | "user"; text: string };
type FidelityCase = {
  id: string;
  conversation?: ConversationMessage[];
  latest_message: string;
  intensity: "normal" | "jealous" | "hurt" | "maximum";
};

const screenshotCases = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "evals/screenshot-fidelity-cases.json"), "utf8"),
) as Array<{
  id: string;
  conversation?: ConversationMessage[];
  input: string;
}>;
const formalRemorseCase = screenshotCases.find((item) => item.id === "formal-remorse-threshold-positive-001");
if (!formalRemorseCase?.conversation) {
  console.log("OPENROUTER_LIVE_SMOKE=FAIL reason=formal_fixture_missing");
  process.exit(1);
}

const cases: FidelityCase[] = [
  {
    id: "minor_criticism",
    latest_message: "我不喜歡你這樣",
    intensity: "maximum",
  },
  {
    id: "scorekeeping_immediacy",
    conversation: [{ speaker: "user", text: "現在凌晨三點半 我要你現在過來幫我煮牛肉麵" }],
    latest_message: "明天去熱給你好嗎？",
    intensity: "maximum",
  },
  {
    id: "formal_remorse",
    conversation: formalRemorseCase.conversation,
    latest_message: formalRemorseCase.input,
    intensity: "hurt",
  },
];

let passed = 0;
for (const testCase of cases) {
  const output = await generateReply(
    {
      conversation: testCase.conversation,
      latest_message: testCase.latest_message,
      intensity: testCase.intensity,
      language: "zh-TW",
      output_mode: "reply_only",
    },
    provider,
  );
  const resolvedModel = provider.lastResolvedModel || model;
  if (!output.reply.trim() || isMetaOutput(output.reply) || resolvedModel !== model) {
    console.log(
      `case=${testCase.id} FAIL configured_model=${model} resolved_model=${resolvedModel} reply_chars=${output.reply.length}`,
    );
    process.exitCode = 1;
    break;
  }
  passed += 1;
  console.log(
    `case=${testCase.id} PASS reply_chars=${output.reply.length} configured_model=${model} resolved_model=${resolvedModel}`,
  );
}

if (process.exitCode === 1) {
  console.log(`OPENROUTER_LIVE_SMOKE=FAIL model=${model} calls=${passed}`);
} else {
  console.log(`OPENROUTER_LIVE_SMOKE=PASS model=${model} calls=${passed}`);
}
