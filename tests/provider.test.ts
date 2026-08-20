import assert from "node:assert/strict";
import { test } from "node:test";
import { ProviderConfigurationError, ProviderRateLimitError } from "../server/errors.js";
import { createGenerationProvider } from "../server/providers/index.js";
import {
  isFreeOpenRouterModel,
  OpenRouterProvider,
  OPENROUTER_DEFAULT_MODEL,
} from "../server/providers/openrouter.js";

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
    reasoning: {
      effort: "none",
      exclude: true,
    },
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

test("429 A: classifies platform limits and preserves safe rate-limit headers", async () => {
  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl: (async () =>
      new Response(JSON.stringify({ error: { code: 429, message: "rate limited" } }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Limit": "50",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1710000000",
        },
      })) as typeof fetch,
  });

  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderRateLimitError);
    assert.deepEqual(error.diagnostics, {
      source: "OPENROUTER_PLATFORM",
      retry_after_seconds: 60,
      "x-ratelimit-limit": "50",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1710000000",
    });
    return true;
  });
});

test("429 B: classifies an upstream provider error from provider_code", async () => {
  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl: (async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "upstream rate limited",
            metadata: { error_type: "rate_limit_exceeded", provider_code: "rate_limited" },
          },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      )) as typeof fetch,
  });

  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderRateLimitError);
    assert.equal(error.diagnostics.source, "UPSTREAM_PROVIDER");
    assert.equal(error.diagnostics.provider_code, "rate_limited");
    return true;
  });
});

test("429 C: classifies an ambiguous response as unknown", async () => {
  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl: (async () =>
      new Response(JSON.stringify({ error: { code: 429, message: "rate limited" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
      })) as typeof fetch,
  });

  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderRateLimitError);
    assert.deepEqual(error.diagnostics, { source: "UNKNOWN" });
    return true;
  });
});

test("429 D: parses a numeric Retry-After value safely", async () => {
  const provider = new OpenRouterProvider({
    apiKey: "sk-or-test",
    fetchImpl: (async () =>
      new Response("", {
        status: 429,
        headers: { "Retry-After": "12.5" },
      })) as typeof fetch,
  });

  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.ok(error instanceof ProviderRateLimitError);
    assert.equal(error.diagnostics.retry_after_seconds, 12.5);
    return true;
  });
});

test("429 E: diagnostics omit credentials and request content", async () => {
  const secret = "sk-or-secret-test";
  const rawRequest = {
    systemPrompt: "private system prompt must not be retained",
    userPrompt: "private conversation must not be retained",
    outputMode: "reply_only" as const,
  };
  const provider = new OpenRouterProvider({
    apiKey: secret,
    fetchImpl: (async () => new Response("", { status: 429 })) as typeof fetch,
  });

  let caught: unknown;
  try {
    await provider.generate(rawRequest);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof ProviderRateLimitError);
  const rendered = [caught.message, caught.stack, JSON.stringify(caught)].join("\n");
  assert.equal(rendered.includes(secret), false);
  assert.equal(rendered.includes(rawRequest.systemPrompt), false);
  assert.equal(rendered.includes(rawRequest.userPrompt), false);
});

test("provider registry defaults to configurable OpenRouter and retains unconfigured Gemini", () => {
  const openrouter = createGenerationProvider({});
  assert.equal(openrouter.name, "openrouter");
  assert.equal(openrouter.model, OPENROUTER_DEFAULT_MODEL);
  assert.equal(openrouter.configured, false);

  const gemini = createGenerationProvider({ GENERATION_PROVIDER: "gemini" });
  assert.equal(gemini.name, "gemini");
  assert.equal(gemini.configured, false);
});

test("free model eligibility accepts the router and explicit :free variants only", () => {
  assert.equal(isFreeOpenRouterModel("openrouter/free"), true);
  assert.equal(isFreeOpenRouterModel("qwen/qwen3-32b:free"), true);
  assert.equal(isFreeOpenRouterModel("google/gemma-4-31b-it"), false);
  assert.equal(isFreeOpenRouterModel("openai/gpt-5"), false);
});
