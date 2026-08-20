import assert from "node:assert/strict";
import { test } from "node:test";
import { createReplyAsJiumanHandler } from "../server/tools/reply-as-jiuman.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "../server/providers/types.js";

class ToolMockProvider implements GenerationProvider {
  readonly name = "mock";
  readonly model = "mock-model";
  readonly configured = true;

  async generate(_request: GenerationRequest): Promise<GenerationResult> {
    return { text: "工具只應回傳這段文字" };
  }
}

test("reply_as_jiuman handler returns visible reply text without explanation framing", async () => {
  const handler = createReplyAsJiumanHandler(new ToolMockProvider());
  const result = await handler({ latest_message: "你今天還好嗎？" });

  assert.deepEqual(result.content, [{ type: "text", text: "工具只應回傳這段文字" }]);
  assert.deepEqual(result.structuredContent, { reply: "工具只應回傳這段文字" });
});
