import dotenv from "dotenv";
import path from "node:path";
import { generateReply } from "../server/generate.js";
import { OpenRouterProvider, OPENROUTER_FREE_MODEL } from "../server/providers/openrouter.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false, quiet: true });

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey) {
  console.log("OPENROUTER_LIVE_SMOKE=BLOCKED_NO_KEY");
  process.exit(0);
}

const model = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_FREE_MODEL;
if (model !== OPENROUTER_FREE_MODEL) {
  console.log(`OPENROUTER_LIVE_SMOKE=SKIPPED_NON_FREE_MODEL model=${model}`);
  process.exit(0);
}

const provider = new OpenRouterProvider({
  apiKey,
  model,
  appName: "Jiuman",
  maxRetries: 0,
});

const cases = [
  {
    id: "normal",
    latest_message: "你今天吃飯了嗎？",
    intensity: "normal" as const,
  },
  {
    id: "replacement",
    latest_message: "這個我找別人幫忙就好了。",
    intensity: "maximum" as const,
  },
  {
    id: "reassurance",
    latest_message: "你對我很重要，我沒有要把你換掉。",
    intensity: "hurt" as const,
  },
];

let passed = 0;
for (const testCase of cases) {
  const output = await generateReply(
    {
      latest_message: testCase.latest_message,
      intensity: testCase.intensity,
      language: "zh-TW",
      output_mode: "reply_only",
    },
    provider,
  );
  if (!output.reply.trim()) throw new Error(`${testCase.id} returned an empty reply`);
  passed += 1;
  console.log(`case=${testCase.id} PASS reply_chars=${output.reply.length}`);
}

console.log(`OPENROUTER_LIVE_SMOKE=PASS model=${model} calls=${passed}`);
