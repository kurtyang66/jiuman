import assert from "node:assert/strict";
import { test } from "node:test";
import { handleReplyRequest } from "../api/reply.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "../server/providers/types.js";

class ActionMockProvider implements GenerationProvider {
  readonly name = "mock";
  readonly model = "mock-model";
  readonly configured = true;
  calls = 0;

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    this.calls += 1;
    assert.equal(request.outputMode, "reply_only");
    return { text: "REST Action mock reply" };
  }
}

function request(method: string, body?: unknown): Request {
  return new Request("https://jiuman.test/api/reply", {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("REST Action returns the existing reply_as_jiuman structured output", async () => {
  const provider = new ActionMockProvider();
  const response = await handleReplyRequest(
    request("POST", { latest_message: "你今天還好嗎？" }),
    provider,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await response.json(), { reply: "REST Action mock reply" });
  assert.equal(provider.calls, 1);
});

test("REST Action rejects invalid request bodies without calling the provider", async () => {
  const provider = new ActionMockProvider();
  const response = await handleReplyRequest(request("POST", { latest_message: "" }), provider);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid request body." });
  assert.equal(provider.calls, 0);
});

test("REST Action handles preflight and unsupported methods", async () => {
  const preflight = await handleReplyRequest(request("OPTIONS"));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "POST, OPTIONS");

  const unsupported = await handleReplyRequest(request("GET"));
  assert.equal(unsupported.status, 405);
  assert.deepEqual(await unsupported.json(), { error: "Only POST and OPTIONS are supported." });
});
