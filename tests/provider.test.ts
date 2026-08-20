import assert from "node:assert/strict";
import { test } from "node:test";
import { ProviderConfigurationError, ProviderRateLimitError } from "../server/errors.js";
import { createGenerationProvider } from "../server/providers/index.js";
import { OpenRouterProvider } from "../server/providers/openrouter.js";

const request = {
  systemPrompt: "system",
  userPrompt: "user",
  outputMode: "reply_only" as const,
};

test("OpenRouter adapter sends an OpenAI-compatible chat completion request", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const fetchImpl = (async (input, init) => {
    calledUrl = String(input);
    calledInit = init;
    return new Response(
      JSON.stringify({
        model: "selected/free-model",
        choices: [{ message: { content: "回覆內容" } }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    model: "openrouter/free",
    fetchImpl,
  });
  const result = await provider.generate(request);

  assert.equal(calledUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal((calledInit?.headers as Record<string, string>).Authorization, "Bearer sk-or-test");
  assert.equal((calledInit?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(calledInit?.body)), {
    model: "openrouter/free",
    messages: [
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ],
    temperature: 0.7,
    max_tokens: 220,
  });
  assert.deepEqual(result, { text: "回覆內容", model: "selected/free-model" });
});

test("OpenRouter adapter never calls the network without a BYOK key", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response();
  }) as typeof fetch;
  const provider = new OpenRouterProvider({ fetchImpl });

  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderConfigurationError);
    return true;
  });
  assert.equal(calls, 0);
});

test("OpenRouter rate limits are bounded and retry behavior is injectable", async () => {
  let calls = 0;
  const delays: number[] = [];
  const fetchImpl = (async () => {
    calls += 1;
    if (calls === 1) return new Response("", { status: 429, headers: { "retry-after": "0" } });
    return new Response(JSON.stringify({ choices: [{ message: { content: "second attempt" } }] }), {
      status: 200,
    });
  }) as typeof fetch;
  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl,
    maxRetries: 1,
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
  });

  const result = await provider.generate(request);
  assert.equal(result.text, "second attempt");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [0]);

  const exhausted = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl: (async () => new Response("", { status: 429 })) as typeof fetch,
  });
  await assert.rejects(exhausted.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderRateLimitError);
    return true;
  });
});

test("provider registry defaults to configurable OpenRouter and retains unconfigured Gemini", () => {
  const openrouter = createGenerationProvider({});
  assert.equal(openrouter.name, "openrouter");
  assert.equal(openrouter.model, "openrouter/free");
  assert.equal(openrouter.configured, false);

  const gemini = createGenerationProvider({ GENERATION_PROVIDER: "gemini" });
  assert.equal(gemini.name, "gemini");
  assert.equal(gemini.configured, false);
});
