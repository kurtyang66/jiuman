import { ZodError } from "zod";
import { createGenerationProvider } from "../server/providers/index.js";
import { createReplyAsJiumanHandler } from "../server/tools/reply-as-jiuman.js";
import type { GenerationProvider } from "../server/providers/types.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleReplyRequest(
  request: Request,
  provider?: GenerationProvider,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Only POST and OPTIONS are supported." });
  }

  let rawInput: unknown;
  try {
    rawInput = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON request body." });
  }

  try {
    const handler = createReplyAsJiumanHandler(provider ?? createGenerationProvider());
    const result = await handler(rawInput);
    return jsonResponse(200, result.structuredContent);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(400, { error: "Invalid request body." });
    }

    console.error("reply_action_error", {
      error_class: error instanceof Error ? error.name : "UnknownError",
      error_message: error instanceof TypeError ? error.message.slice(0, 160) : undefined,
    });
    return jsonResponse(500, { error: "Reply generation could not be completed." });
  }
}

export default { fetch: handleReplyRequest };
